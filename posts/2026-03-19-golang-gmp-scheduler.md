---
title: 深入理解 Go GMP 调度模型
date: 2026-03-19
tags: [Go, 并发, 运行时]
summary: 从线程模型的演进出发，剖析 Go 运行时 GMP 调度器的核心设计：G/M/P 三者的职责、工作窃取算法、抢占机制，以及调度器如何在高并发下保持低延迟。
---

## 为什么需要 GMP

理解 GMP 之前，先问一个问题：为什么 Go 不直接用操作系统线程？

操作系统线程是重量级资源。创建一个线程默认需要 1–8 MB 的栈空间，线程切换涉及内核态/用户态切换，成本约为 1–10 微秒。如果你的服务要同时处理 10 万个连接，用线程来一一对应，光是内存就需要 100 GB+，这显然不可行。

Go 的答案是 **Goroutine**：一种由运行时管理的轻量级协程，初始栈仅 2 KB，可按需增长，创建和切换完全在用户态完成，成本比线程低 2–3 个数量级。

管理这些 Goroutine 的机制，就是 **GMP 调度器**。

---

## GMP 三个核心概念

### G：Goroutine

G 是 Go 程序的执行单元。每个 `go func()` 调用都会创建一个 G，它包含：

- 执行栈（初始 2 KB，最大默认 1 GB）
- 程序计数器（PC）、栈指针等寄存器状态
- 当前状态：`_Grunnable`（等待运行）、`_Grunning`（运行中）、`_Gwaiting`（等待唤醒）等

### M：Machine（OS 线程）

M 是真正执行代码的操作系统线程。M 的数量默认受 `GOMAXPROCS` 影响，上限由 `runtime/debug.SetMaxThreads` 控制（默认 10000）。

关键点：**M 必须绑定一个 P 才能运行 G**。没有 P 的 M 会进入休眠等待。

### P：Processor（逻辑处理器）

P 是调度的核心资源，数量固定为 `GOMAXPROCS`（默认等于 CPU 核心数）。P 持有：

- **本地运行队列**（Local Run Queue，LRQ）：最多 256 个 Goroutine
- 内存分配缓存（mcache）
- 调度统计信息

P 是 G 和 M 之间的桥梁。M 必须持有 P，才能从队列里取 G 来执行。

```
              全局运行队列 (GRQ)
                    │
        ┌───────────┼───────────┐
        │           │           │
       P0          P1          P2
      (LRQ)       (LRQ)       (LRQ)
        │           │           │
        M0          M1          M2
        │           │           │
       执行G        执行G        执行G
```

---

## 调度的基本流程

### 创建 Goroutine

```go
go foo()
```

运行时执行 `runtime.newproc`：

1. 从当前 P 的空闲 G 池（`gfree`）复用或新建一个 G 结构体
2. 初始化栈、设置入口函数为 `foo`
3. 将 G 状态设为 `_Grunnable`，**优先放入当前 P 的本地队列**
4. 如果本地队列满（256 个），将一半 G 移入全局队列

本地队列优先的设计减少了锁竞争——本地队列操作无锁，全局队列操作需要加锁。

### 执行循环：`schedule()`

M 不断执行 `runtime.schedule()`，寻找下一个可运行的 G：

```
schedule() 查找顺序：
  1. 每 61 次调度检查一次全局队列（防止全局队列饥饿）
  2. 从当前 P 的本地队列头部取 G
  3. 本地队列为空 → 执行 findrunnable()
     a. 再次检查全局队列
     b. 检查网络轮询器（netpoller）中就绪的 G
     c. 工作窃取：随机选一个 P，偷走其本地队列的一半 G
     d. 全部失败 → M 休眠，释放 P
```

---

## 工作窃取（Work Stealing）

工作窃取是 GMP 保持 CPU 高利用率的关键机制。

当某个 P 的本地队列空了，它不会立刻让 M 休眠，而是随机选择另一个 P 并偷走其队列**后半部分**的 G：

```go
// 伪代码
func stealWork(victim *p) *g {
    n := len(victim.runq) / 2
    return victim.runq.grabHalf(n)
}
```

**为什么偷后半部分而不是前半部分？**

生产者从队列**尾部**放入 G（新建的 G），消费者从**头部**取 G（FIFO）。偷后半部分意味着偷走的是"最新创建的" G——这些 G 的数据更可能还在 CPU 缓存中，局部性更好。

---

## 系统调用与 M 的分离

当 G 执行阻塞系统调用（如文件读写）时，M 会被操作系统挂起。如果 P 一直等待这个 M，整个处理器就被浪费了。

Go 运行时的处理方式：

```
G 发起阻塞系统调用
        │
        ▼
M 与 P 解绑（handoff）
P 被另一个休眠的 M（或新建 M）接管，继续调度其他 G
        │
        ▼（系统调用返回）
原来的 M 尝试重新获取一个空闲 P
  ├── 成功：继续运行 G
  └── 失败：G 放入全局队列，M 进入休眠
```

对于**非阻塞**的网络 I/O，Go 使用 **netpoller**（基于 epoll/kqueue）将 G 挂起而不占用 M，I/O 就绪后由后台线程将 G 重新放入运行队列。这就是为什么 Go 能用同步写法实现高并发网络服务。

---

## 抢占机制

早期 Go（1.13 之前）只有**协作式抢占**：Goroutine 只在函数调用时检查抢占标志。这意味着一个没有函数调用的紧循环会独占 M，导致其他 G 饥饿：

```go
// 这在 Go 1.13 之前会导致调度器饥饿
go func() {
    for {
        // 没有函数调用，永远不会被抢占
        i++
    }
}()
```

Go 1.14 引入了**基于信号的异步抢占**：

- 后台监控线程（`sysmon`）每隔 10ms 检测运行超过 10ms 的 G
- 向对应的 M 发送 `SIGURG` 信号
- 信号处理函数将 G 的 PC 修改为抢占函数，强制让出 CPU

这使得 Go 具备了真正的抢占能力，GC STW（Stop The World）时间也大幅缩短。

---

## sysmon：后台监控线程

`sysmon` 是一个不需要 P 就能运行的特殊 M，每隔 10–60ms 唤醒一次，负责：

| 职责 | 说明 |
|------|------|
| 抢占检测 | 发现运行超时的 G，发送 SIGURG |
| netpoller | 将网络就绪的 G 注入运行队列 |
| 强制 GC | 检测距上次 GC 超过 2 分钟则触发 |
| 归还空闲 P | 将长时间空闲的 P 归还，减少线程浪费 |

---

## 一个调度场景的完整走读

```go
package main

import (
    "fmt"
    "net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
    // ① 运行在某个 G 上，绑定到 P0/M0
    resp, err := http.Get("https://api.example.com/data")
    // ② 发起网络请求 → G 挂起，注册到 netpoller
    //    M0 释放这个 G，从 P0 队列取下一个 G 继续执行
    // ③ 网络响应就绪 → sysmon/netpoller 将 G 重新放入某个 P 的队列
    // ④ G 被某个 M 捡起，继续执行
    if err == nil {
        defer resp.Body.Close()
        fmt.Fprintln(w, "ok")
    }
}

func main() {
    http.HandleFunc("/", handler)
    http.ListenAndServe(":8080", nil)
}
```

整个过程中，M 的数量远小于并发请求数——这正是 Go 能用少量线程支撑大量并发的原因。

---

## 调试与观测

**查看调度器状态：**

```bash
# 每隔 1 秒打印调度器统计
GODEBUG=schedtrace=1000 go run main.go

# 输出示例：
# SCHED 1000ms: gomaxprocs=8 idleprocs=6 threads=10 spinningthreads=1
#               idlethreads=3 runqueue=0 [0 0 1 0 0 0 0 0]
#               ↑全局队列   ↑各P本地队列长度
```

**查看 Goroutine 泄漏：**

```go
import _ "net/http/pprof"
// 访问 /debug/pprof/goroutine?debug=1 查看所有 Goroutine 调用栈
```

**用 `runtime` 包直接获取：**

```go
fmt.Println("Goroutine 数量:", runtime.NumGoroutine())
fmt.Println("P 数量:", runtime.GOMAXPROCS(0))
fmt.Println("CPU 核心数:", runtime.NumCPU())
```

---

## 总结

GMP 模型的设计哲学是**用复杂性换简单性**：运行时承担了所有调度的复杂性，开发者只需要写 `go func()`，其余交给调度器。

核心设计决策一览：

| 设计 | 目的 |
|------|------|
| G 轻量化（2KB 栈） | 支持百万级并发 |
| P 本地队列无锁 | 减少竞争，提升吞吐 |
| 工作窃取 | 均衡负载，提升 CPU 利用率 |
| netpoller 异步 I/O | 同步写法不阻塞线程 |
| 异步抢占（信号） | 防止调度饥饿，缩短 GC STW |
| sysmon 后台监控 | 兜底保障，处理各类异常情况 |

理解 GMP 不只是为了面试——当你在生产环境遇到 Goroutine 泄漏、调度延迟抖动或 GC 压力时，这些知识会直接指导你定位问题。

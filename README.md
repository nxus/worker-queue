# Nxus Worker Queue Module

Using Redis for pub/sub background tasks

## Installation

    > npm install @nxus/worker-queue --save

## Usage

For each task, you need to define a unique task name.

### Register a worker handler

```
app.get('worker-queue').worker('myBackgroundTask', (msg) => {
  console.log("Hello", msg.hi)
})
```

### Request task processing

`app.get('worker-queue').task('myBackgroundTask', {hi: world})`

### Receive notifications of completed tasks

Register two tasks, one for processing and one for notifications, and trigger the second from within the first handler.

```
app.get('worker-queue').worker('myBackgroundTask', (msg) => {
  console.log("Hello", msg.hi)
  app.get('worker-queue').task('myBackgroundTask-complete', {result: true})
})
app.get('worker-queue').worker('myBackgroundTask-complete', (msg) => {
  console.log("Completed", msg.result)
})
```

`app.get('worker-queue').task('myBackgroundTask', {hi: world})`


## API



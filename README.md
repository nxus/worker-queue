# @nxus/worker-queue

## 

[![Build Status](https://travis-ci.org/nxus/worker-queue.svg?branch=master)](https://travis-ci.org/nxus/worker-queue)

Using Redis for pub/sub background tasks

### Installation

    > npm install @nxus/worker-queue --save

### Usage

For each task, you need to define a unique task name.

#### Register a worker handler

    app.get('worker-queue').worker('myBackgroundTask', ({data}) => {
      this.app.log.debug("Hello", data.hi)
    })

#### Request task processing

`app.get('worker-queue').task('myBackgroundTask', {hi: world})`

#### Receive notifications of completed tasks

Register two tasks, one for processing and one for notifications, and trigger the second from within the first handler.

    app.get('worker-queue').worker('myBackgroundTask', ({data}) => {
      this.app.log.debug("Hello", data.hi)
      app.get('worker-queue').task('myBackgroundTask-complete', {result: true})
    })
    app.get('worker-queue').worker('myBackgroundTask-complete', ({data}) => {
      this.app.log.debug("Completed", data.result)
    })

`app.get('worker-queue').task('myBackgroundTask', {hi: world})`

## API

* * *

## WorkerQueue

Worker Queue module for background tasks

### clean

Cleans the current queue for the given taskName. Good idea to do this on occasion as Bull will keep all completed tasks in Redis.

**Parameters**

-   `taskName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The name of the queue to clean. If not provided, all queues are cleaned.

### task

Request handling of a background task

**Parameters**

-   `taskName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Name of the task (channel) to publish to
-   `message` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** Options for the task worker

**Examples**

```javascript
app.get('worker-queue').task('backgroundJob', {hi: 'world'})
```

### worker

Provide a task handler

**Parameters**

-   `taskName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Name of the task (channel) to listen for
-   `handler` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** Handler for processing task requests

**Examples**

```javascript
app.get('worker-queue').worker('backgroundJob', (msg) -> {})
```

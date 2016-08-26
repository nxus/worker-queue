# nxus-worker-queue

## 

[![Build Status](https://travis-ci.org/nxus/worker-queue.svg?branch=master)](https://travis-ci.org/nxus/worker-queue)

Using Redis for pub/sub background tasks

### Installation

    > npm install nxus-worker-queue --save

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

## index

Worker Queue module for background tasks

## worker

Provide a task handler

**Parameters**

-   `taskName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Name of the task (channel) to listen for
-   `handler` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** Handler for processing task requests

**Examples**

```javascript
app.get('worker-queue').worker('backgroundJob', (msg) -> {})
```

## task

Request handling of a background task

**Parameters**

-   `taskName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Name of the task (channel) to publish to
-   `message` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** Options for the task worker;
      must be JSON serializable

**Examples**

```javascript
app.get('worker-queue').task('backgroundJob', {hi: 'world'})
```

## clean

Cleans the current queue for the given taskName.

**Parameters**

-   `taskName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The queue/task name to clean.
-   `type` **\[[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)](default 'completed')** The type of message to clean. Defaults to 'completed'.
-   `delay` **\[[Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)](default 60000)** The grace period. Messages older than this will be cleaned. Defaults to 60 seconds.

## cleanAll

Cleans all queues.

**Parameters**

-   `type` **\[[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)](default 'completed')** The type of message to clean. Defaults to 'completed'.
-   `delay` **\[[Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)](default 60000)** The grace period. Messages older than this will be cleaned. Defaults to 60 seconds.

## empty

Emptys the current queue for the given taskName.

**Parameters**

-   `taskName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The name of the queue to empty. If not provided, all queues are emptied.

## emptyAll

Emptys the all queues.

**Parameters**

-   `taskName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The name of the queue to empty. If not provided, all queues are emptied.

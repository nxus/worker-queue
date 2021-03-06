# nxus-worker-queue

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

-   [Worker Queue Module](#worker-queue-module)
    -   [Installation](#installation)
    -   [Configuration Options](#configuration-options)
    -   [Usage](#usage)
        -   [Register a worker handler](#register-a-worker-handler)
        -   [Request task processing](#request-task-processing)
        -   [The job object and notification of completed tasks](#the-job-object-and-notification-of-completed-tasks)
-   [API](#api)
    -   [WorkerQueue](#workerqueue)
        -   [worker](#worker)
        -   [task](#task)
        -   [clean](#clean)
        -   [cleanAll](#cleanall)
        -   [empty](#empty)
        -   [emptyAll](#emptyall)

### 

## Worker Queue Module

[![Build Status](https://travis-ci.org/nxus/worker-queue.svg?branch=master)](https://travis-ci.org/nxus/worker-queue)

Using Redis for pub/sub background tasks

### Installation

        > npm install nxus-worker-queue --save

### Configuration Options

        "worker_queue": {
          "redis_url": "redis://localhost:6379",
          "cleanInterval": 3600000
        }

It's conventional to use a configuration variable to set the
Redis URL in the production environment. For example:

        let config = {}
        if (process.env.REDIS_URL)
          config.worker_queue = { redis_url: process.env.REDIS_URL }
        application.start(config)

### Usage

For each task, you need to define a unique task name.

#### Register a worker handler

        import {workerQueue} from 'nxus-worker-queue'
        workerQueue.worker('myBackgroundTask', ({data}) => {
          this.log.debug("Hello", data.hi)
        })

#### Request task processing

        import {workerQueue} from 'nxus-worker-queue'
        let job = workerQueue.task('myBackgroundTask', {hi: world})

#### The job object and notification of completed tasks

The worker queue module interacts with Redis through the intermediary
Bull package. This "fastest, most reliable, Redis-based queue for
Node" is "carefully written for rock solid stability and atomicity".
For documentation, a good place to start is
the [Reference](https://github.com/pertoo/bull/blob/master/REFERENCE.md) page.

The `task()` method returns a Bull `Job` object that allows you to
interact with the background task.

In particular, the `Job` object exposes a `finished()` method that,
when invoked, returns a promise that resolves when the job finishes.
The value of the promise corresponds to the value of the promise
returned by the task handler.

        let job = workerQueue.task('myBackgroundTask', {hi: world})
        job.finished().then((rslt) = { console.log('background task finished: ', rslt) })

## API

* * *

### WorkerQueue

**Extends NxusModule**

Worker Queue module for background tasks

#### worker

Provide a task handler

**Parameters**

-   `taskName` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Name of the task (channel) to listen for
-   `handler` **[function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)** Handler for processing task requests;
      should return a promise that resolves on completion
-   `opts`   (optional, default `{}`)

**Examples**

```javascript
workerQueue.worker('backgroundJob', (msg) -> {})
```

#### task

Request handling of a background task

**Parameters**

-   `taskName` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Name of the task (channel) to publish to
-   `message` **[object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** Options for the task worker;
      must be JSON serializable
-   `opts`   (optional, default `{}`)

**Examples**

```javascript
workerQueue.task('backgroundJob', {hi: 'world'})
```

Returns **[object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** Bull job object

#### clean

Cleans the current queue for the given taskName.

**Parameters**

-   `taskName` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The queue/task name to clean.
-   `type` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The type of message to clean. Defaults to 'completed'. (optional, default `'completed'`)
-   `delay` **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** The grace period. Messages older than this will be cleaned. Defaults to 1 hour. (optional, default `3600000`)

#### cleanAll

Cleans all queues for the specified message type.

**Parameters**

-   `type` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The type of message to clean. Defaults to 'completed'. (optional, default `'completed'`)
-   `delay` **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** The grace period. Messages older than this will be cleaned. Defaults to 1 hour. (optional, default `3600000`)

#### empty

Emptys the current queue for the given taskName.

**Parameters**

-   `taskName` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The name of the queue to empty. If not provided, all queues are emptied.

#### emptyAll

Emptys the all queues.

**Parameters**

-   `taskName` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The name of the queue to empty. If not provided, all queues are emptied.

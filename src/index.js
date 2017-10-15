/*
* @Author: Mike Reich
* @Date:   2016-02-05 07:45:34
* @Last Modified 2016-09-09
*/
/**
 * # Worker Queue Module
 *
 * [![Build Status](https://travis-ci.org/nxus/worker-queue.svg?branch=master)](https://travis-ci.org/nxus/worker-queue)
 *
 * Using Redis for pub/sub background tasks
 *
 * ## Installation
 *
 *     > npm install nxus-worker-queue --save
 *
 * ## Configuration Options
 *
 *     "worker_queue": {
 *       "redis_url": "redis://localhost:6379"
 *     }
 *
 * It's conventional to use a configuration variable to set the
 * Redis URL in the production environment. For example:
 *
 *     application.config['worker_queue'].redis_url =
 *       process.env.REDIS_URL || application.config['worker_queue'].redis_url
 *
 * ## Usage
 *
 * For each task, you need to define a unique task name.
 *
 * ### Register a worker handler
 *
 * ```
 * import {workerQueue} from 'nxus-worker-queue'
 * workerQueue.worker('myBackgroundTask', ({data}) => {
 *   this.log.debug("Hello", data.hi)
 * })
 * ```
 *
 * ### Request task processing
 *
 * ```
 * import {workerQueue} from 'nxus-worker-queue'
 * workerQueue.task('myBackgroundTask', {hi: world})
 * ```
 *
 * ### Receive notifications of completed tasks
 *
 * Register two tasks, one for processing and one for notifications, and trigger the second from within the first handler.
 *
 * ```
 * import {workerQueue} from 'nxus-worker-queue'
 * workerQueue.worker('myBackgroundTask', ({data}) => {
 *   this.log.debug("Hello", data.hi)
 *   workerQueue.task('myBackgroundTask-complete', {result: true})
 * })
 * workerQueue.worker('myBackgroundTask-complete', ({data}) => {
 *   this.log.debug("Completed", data.result)
 * })
 * ```
 *
 * `workerQueue.task('myBackgroundTask', {hi: world})`
 *
 *
 * # API
 * ----
 */

'use strict';

import Queue from 'bull'
import URL from 'url'
import Promise from 'bluebird'
import _ from 'underscore'

import {application as app, NxusModule} from 'nxus-core'

/**
 * Worker Queue module for background tasks
 */
class WorkerQueue extends NxusModule {
  constructor() {
    super()

    this._queues = {}

    app.once('stop', () => {
      _.each(this._queues, (queue, name) => {
        return queue.close().then(() => {this.log.debug('Queue closed', name)})
      })

      if(this._cleanInterval) clearInterval(this._cleanInterval)
    })

    if(this.config.cleanInterval) {
      this._cleanInterval = setInterval(() => {
        this.cleanAll()
        this.cleanAll('failed')
      }, this.config.cleanInterval)
    }
  }

  _userConfig() {
    return {
      redis_url: 'redis://localhost:6379'
    }
  }

  _defaultConfig() {
    return {
      cleanInterval: 3600000
    }
  }

  _connect(name) {
    if(!this._queues[name]) {
      this._queues[name] = new Queue(name, this.config.redis_url)
      this._queues[name].on('error', (error) => {
        this.log.error(error)
      })
      this._queues[name].on('stalled', (job) => {
        this.log.warn("Worker-queue task stalled", job)
      })
    }
  }

  // Handlers

  /**
   * Provide a task handler
   * @param {string} taskName Name of the task (channel) to listen for
   * @param {function} handler Handler for processing task requests
   * @example workerQueue.worker('backgroundJob', (msg) -> {})
   */

  worker (taskName, handler) {
    this._connect(taskName)
    this.log.debug('Registering task worker for', taskName)
    this._queues[taskName].process(handler)
  }

  /**
   * Request handling of a background task
   * @param {string} taskName Name of the task (channel) to publish to
   * @param {object} message Options for the task worker;
   *   must be JSON serializable
   * @example workerQueue.task('backgroundJob', {hi: 'world'})
   */
  task (taskName, message) {
    this.log.debug('Task requested', taskName)
    this._connect(taskName)
    return this._queues[taskName].add(message)
  }

  /**
   * Cleans the current queue for the given taskName.
   * @param  {string} taskName The queue/task name to clean.
   * @param  {String} type     The type of message to clean. Defaults to 'completed'.
   * @param  {Number} delay    The grace period. Messages older than this will be cleaned. Defaults to 60 seconds.
   */
  clean(taskName, type = 'completed', delay = 60000) {
    if(!this._queues[taskName]) return this.log.error('Queue does not exist to clean', taskName)
    this.log.debug('Cleaning Queue', taskName+":"+type)
    let queue = this._queues[taskName]
    return queue.clean(delay, type)
  }

  /**
   * Cleans all queues for the specified message type.
   * @param  {String} type     The type of message to clean. Defaults to 'completed'.
   * @param  {Number} delay    The grace period. Messages older than this will be cleaned. Defaults to 60 seconds.
   */
  cleanAll(type = 'completed', delay = 60000) {
    this.log.debug('Cleaning all queues:', type)
    return Promise.mapSeries(_.values(this._queues), (queue) => {
      return queue.clean(delay, type)
    })
  }

  /**
   * Emptys the current queue for the given taskName.
   * @param  {string} taskName The name of the queue to empty. If not provided, all queues are emptied.
   */
  empty(taskName) {
    if(!this._queues[taskName]) return this.log.error('Queue does not exist to empty', taskName)
    this.log.debug('Emptying Queue', taskName)
    return this._queues[taskName].empty()
  }

  /**
   * Emptys the all queues.
   * @param  {string} taskName The name of the queue to empty. If not provided, all queues are emptied.
   */
  emptyAll() {
    this.log.debug('Emptying all queues')
    return Promise.mapSeries(_.values(this._queues), (queue) => {
      return queue.empty()
    })
  }
}

var workerQueue = WorkerQueue.getProxy()
export {WorkerQueue as default, workerQueue}

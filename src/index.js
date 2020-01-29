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
 *         > npm install nxus-worker-queue --save
 *
 * ## Configuration Options
 *
 *         "worker_queue": {
 *           "redis_url": "redis://localhost:6379",
 *           "cleanInterval": 3600000
 *         }
 *
 * It's conventional to use a configuration variable to set the
 * Redis URL in the production environment. For example:
 *
 *         let config = {}
 *         if (process.env.REDIS_URL)
 *           config.worker_queue = { redis_url: process.env.REDIS_URL }
 *         application.start(config)
 *
 * ## Usage
 *
 * For each task, you need to define a unique task name.
 *
 * ### Register a worker handler
 *
 *         import {workerQueue} from 'nxus-worker-queue'
 *         workerQueue.worker('myBackgroundTask', ({data}) => {
 *           this.log.debug("Hello", data.hi)
 *         })
 *
 * ### Request task processing
 *
 *         import {workerQueue} from 'nxus-worker-queue'
 *         let job = workerQueue.task('myBackgroundTask', {hi: world})
 *
 * ### The job object and notification of completed tasks
 *
 * The worker queue module interacts with Redis through the intermediary
 * Bull package. This "fastest, most reliable, Redis-based queue for
 * Node" is "carefully written for rock solid stability and atomicity".
 * For documentation, a good place to start is
 * the [Reference](https://github.com/pertoo/bull/blob/master/REFERENCE.md) page.
 *
 * The `task()` method returns a Bull `Job` object that allows you to
 * interact with the background task.
 *
 * In particular, the `Job` object exposes a `finished()` method that,
 * when invoked, returns a promise that resolves when the job finishes.
 * The value of the promise corresponds to the value of the promise
 * returned by the task handler.
 *
 *         let job = workerQueue.task('myBackgroundTask', {hi: world})
 *         job.finished().then((rslt) = { console.log('background task finished: ', rslt) })
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

    this._connected = app.once('connect', ::this._connect)
    this._launched = app.once('launch', ::this._launch)
    app.once('stop', ::this._disconnect)

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

  _connect() {
    this.log.debug('Connecting task queues')
    if(this.config.cleanInterval) {
      this._cleanInterval = setInterval(() => {
        this.cleanAll()
        this.cleanAll('failed')
      }, this.config.cleanInterval)
    }
  }

  async _disconnect() {
    this.log.debug('Disconnecting task queues')
    for (let [name, queue] of Object.entries(this._queues)) {
      await queue.close()
      this.log.debug('Queue closed', name)
      delete this._queues[name]
    }
    if(this._cleanInterval) clearInterval(this._cleanInterval)
  }

  _launch() {
    this.log.debug('Ready to process tasks')
  }

  async _register(name, handler, opts = {}) {
    await this._connected
    this.log.debug('Registering task worker for', name)
    if(!this._queues[name]) {
      this._queues[name] = new Queue(name, this.config.redis_url, opts)
      this._queues[name].on('error', (error) => {
        this.log.error(error)
      })
      this._queues[name].on('stalled', (job) => {
        this.log.warn("Worker-queue task stalled", job)
      })
      this._queues[name].on('failed', (job, err) => {
        this.log.warn("Worker queue job failed", err)
      })
      if (handler) {
        this._queues[name].process(handler)
      }
    }
  }

  // Handlers

  /**
   * Provide a task handler
   * @param {string} taskName Name of the task (channel) to listen for
   * @param {function} handler Handler for processing task requests;
   *   should return a promise that resolves on completion
   * @example workerQueue.worker('backgroundJob', (msg) -> {})
   */

  worker (taskName, handler, opts = {}) {
    return this._register(taskName, handler, opts)
  }

  /**
   * Request handling of a background task
   * @param {string} taskName Name of the task (channel) to publish to
   * @param {object} message Options for the task worker;
   *   must be JSON serializable
   * @returns {object} Bull job object
   * @example workerQueue.task('backgroundJob', {hi: 'world'})
   */
  async task (taskName, message, opts = {}) {
    this.log.debug('Task requested', taskName)
    await this._register(taskName)
    await this._launched
    return this._queues[taskName].add(message, opts)
  }

  /**
   * Cleans the current queue for the given taskName.
   * @param  {string} taskName The queue/task name to clean.
   * @param  {String} type     The type of message to clean. Defaults to 'completed'.
   * @param  {Number} delay    The grace period. Messages older than this will be cleaned. Defaults to 1 hour.
   */
  clean(taskName, type = 'completed', delay = 3600000) {
    if(!this._queues[taskName]) return this.log.error('Queue does not exist to clean', taskName)
    this.log.debug('Cleaning Queue', taskName+":"+type)
    let queue = this._queues[taskName]
    return queue.clean(delay, type)
  }

  /**
   * Cleans all queues for the specified message type.
   * @param  {String} type     The type of message to clean. Defaults to 'completed'.
   * @param  {Number} delay    The grace period. Messages older than this will be cleaned. Defaults to 1 hour.
   */
  cleanAll(type = 'completed', delay = 3600000) {
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

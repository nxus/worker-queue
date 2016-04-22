/* 
* @Author: Mike Reich
* @Date:   2016-02-05 07:45:34
* @Last Modified 2016-04-22
*/
/**
 *
 * [![Build Status](https://travis-ci.org/nxus/worker-queue.svg?branch=master)](https://travis-ci.org/nxus/worker-queue)
 * 
 * Using Redis for pub/sub background tasks
 * 
 * ## Installation
 * 
 *     > npm install @nxus/worker-queue --save
 * 
 * ## Usage
 * 
 * For each task, you need to define a unique task name.
 * 
 * ### Register a worker handler
 * 
 * ```
 * app.get('worker-queue').worker('myBackgroundTask', ({data}) => {
 *   this.app.log.debug("Hello", data.hi)
 * })
 * ```
 * 
 * ### Request task processing
 * 
 * `app.get('worker-queue').task('myBackgroundTask', {hi: world})`
 * 
 * ### Receive notifications of completed tasks
 * 
 * Register two tasks, one for processing and one for notifications, and trigger the second from within the first handler.
 * 
 * ```
 * app.get('worker-queue').worker('myBackgroundTask', ({data}) => {
 *   this.app.log.debug("Hello", data.hi)
 *   app.get('worker-queue').task('myBackgroundTask-complete', {result: true})
 * })
 * app.get('worker-queue').worker('myBackgroundTask-complete', ({data}) => {
 *   this.app.log.debug("Completed", data.result)
 * })
 * ```
 * 
 * `app.get('worker-queue').task('myBackgroundTask', {hi: world})`
 * 
 * 
 * # API
 * ----
 */

'use strict';

import Queue from 'bull'
import URL from 'url'

const _defaultConfig = {
  redis_url: process.env.REDIS_URL || 'redis://localhost:6379'
}

/**
 * Worker Queue module for background tasks
 */
export default class WorkerQueue {
  constructor(app) {
    this.app = app
    this.config = Object.assign(_defaultConfig, app.config['worker-queue'])

    app.get('worker-queue').use(this)
      .gather('worker')
      .respond('task')
      
    this._queues = {}
  }

  _connect(name) {
    let opts = {url: this.config.redis_url}
    if(!this._queues[name]) this._queues[name] = new Queue(name, URL.parse(this.config.redis_url).port, URL.parse(this.config.redis_url).hostname, opts);
  }

  // Handlers

  /**
   * Provide a task handler
   * @param {string} taskName Name of the task (channel) to listen for
   * @param {function} handler Handler for processing task requests
   * @example app.get('worker-queue').worker('backgroundJob', (msg) -> {})
   */
  
  worker (taskName, handler) {
    this._connect(taskName)
    this.app.log.debug('Registering task worker for', taskName)
    this._queues[taskName].process(handler)
  }

  /**
   * Request handling of a background task
   * @param {string} taskName Name of the task (channel) to publish to
   * @param {object} message Options for the task worker
   * @example app.get('worker-queue').task('backgroundJob', {hi: 'world'})
   */
  task (taskName, message) {
    this.app.log.debug('Task requested', taskName)
    this._connect(taskName)
    this._queues[taskName].add(message)
  }
} 

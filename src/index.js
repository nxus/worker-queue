/* 
* @Author: Mike Reich
* @Date:   2016-02-05 07:45:34
* @Last Modified 2016-08-26
*/
/**
 *
 * [![Build Status](https://travis-ci.org/nxus/worker-queue.svg?branch=master)](https://travis-ci.org/nxus/worker-queue)
 * 
 * Using Redis for pub/sub background tasks
 * 
 * ## Installation
 * 
 *     > npm install nxus-worker-queue --save
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
import Promise from 'bluebird'
import _ from 'underscore'

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
      .respond('clean')
      .respond('cleanAll')
      .respond('empty')
      .respond('emptyAll')
      
    this._queues = {}

    this.app.on('stop', () => {
      _.each(this._queues, (queue, name) => {
        return queue.close().then(() => {this.app.log.debug('Queue closed', name)})
      })
    })
  }

  _connect(name) {
    let parsed = URL.parse(this.config.redis_url)
    let opts = {url: this.config.redis_url}
    if(parsed.auth)
      opts.password = parsed.auth.substr(parsed.auth.indexOf(":")+1, parsed.auth.length-1)
    if(!this._queues[name]) this._queues[name] = new Queue(name, URL.parse(this.config.redis_url).port, URL.parse(this.config.redis_url).hostname, opts);
    this._queues[name].on('error', (error) => {
      this.app.log.error(error)
    })
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
   * @param {object} message Options for the task worker;
   *   must be JSON serializable
   * @example app.get('worker-queue').task('backgroundJob', {hi: 'world'})
   */
  task (taskName, message) {
    this.app.log.debug('Task requested', taskName)
    this._connect(taskName)
    this._queues[taskName].add(message)
  }

  /**
   * Cleans the current queue for the given taskName. 
   * @param  {string} taskName The queue/task name to clean.
   * @param  {String} type     The type of message to clean. Defaults to 'completed'.
   * @param  {Number} delay    The grace period. Messages older than this will be cleaned. Defaults to 60 seconds.
   */
  clean(taskName, type = 'completed', delay = 60000) {
    if(!this._queues[taskName]) return this.app.log.error('Queue does not exist to clean', taskName)
    this.app.log.debug('Cleaning Queue', taskName+":"+type)
    let queue = this._queues[taskName]
    return queue.clean(delay, type)
  }

  /**
   * Cleans all queues. 
   * @param  {String} type     The type of message to clean. Defaults to 'completed'.
   * @param  {Number} delay    The grace period. Messages older than this will be cleaned. Defaults to 60 seconds.
   */
  cleanAll(type = 'completed', delay = 60000) {
    this.app.log.debug('Cleaning all queues:', type)
    return Promise.mapSeries(_.values(this._queues), (queue) => {
      return queue.clean(delay, type)
    })
  }

  /**
   * Emptys the current queue for the given taskName. 
   * @param  {string} taskName The name of the queue to empty. If not provided, all queues are emptied.
   */
  empty(taskName) {
    if(!this._queues[taskName]) return this.app.log.error('Queue does not exist to empty', taskName)
    this.app.log.debug('Emptying Queue', taskName)
    return this._queues[taskName].empty()
  }

  /**
   * Emptys the all queues. 
   * @param  {string} taskName The name of the queue to empty. If not provided, all queues are emptied.
   */
  emptyAll() {
    this.app.log.debug('Emptying all queues')
    return Promise.mapSeries(_.values(this._queues), (queue) => {
      return queue.empty()
    })
  }
} 

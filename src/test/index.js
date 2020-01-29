/* 
* @Author: Mike Reich
* @Date:   2016-02-13 08:59:44
* @Last Modified 2016-09-09
*/

'use strict'

import WorkerQueue from '../'

import {application as app} from 'nxus-core'

import RedisServer from 'redis-server'
import sinon from 'sinon'

var TEST_REDIS_PORT = 6300
var TEST_REDIS_URL

function makeWorkerQueue() {
  module = new WorkerQueue()
  module.config.redis_url = TEST_REDIS_URL
  return module
}


describe("Worker Queue", () => {
  var module, testQueue

  before(async () => {
    let redisServer = new RedisServer(TEST_REDIS_PORT)
    await redisServer.open()
    TEST_REDIS_URL = 'redis://localhost:'+TEST_REDIS_PORT
    sinon.spy(app, 'once')
  })
  
  beforeEach(function() {
    this.timeout(3000)
  })
  
  describe("Import", () => {
    it("should not be null", () => WorkerQueue.should.not.be.null)

    it("should be instantiated", () => {
      module = makeWorkerQueue()
      module.should.not.be.null
    })
  })

  describe("Init", () => {
    beforeEach(async () => {
      module = makeWorkerQueue()
      module._queues.should.not.be.null
      sinon.spy(module, '_connect')
      sinon.spy(module, '_launch')
      sinon.spy(module, '_disconnect')
      module.worker('test')
      await app.emit('connect')
      testQueue = module._queues['test']
      sinon.spy(testQueue, 'add')
      sinon.spy(testQueue, 'process')
      sinon.spy(testQueue, 'close')
      
    })

    it('connects on boot stage', async () => {
      app.once.calledWith('connect').should.be.true
      module._connect.should.be.called
      testQueue.process.should.be.called
    })
    it('launches on boot stage', async () => {
      app.once.calledWith('launch').should.be.true
      module.task('test', {a:1})
      testQueue.add.should.not.be.called
      await app.emit('launch')
      module._launch.should.be.called
      testQueue.add.should.be.called
    })
    it('disconnects on boot stage', async () => {
      app.once.calledWith('stop').should.be.true
      testQueue.close.should.not.be.called
      await app.emit('stop')
      module._launch.should.be.called
      testQueue.close.should.be.called
      module._queues.should.not.have.property('test')
    })
  })

  describe("Tasks", () => {
    beforeEach(() => {
      module = makeWorkerQueue()
      app.emit('connect')
      app.emit('launch')
    })
    it("should process tasks", (done) => {
      module.worker('testTask', ({data}) => {
        data.hi.should.equal("World")
        done()
      })
      setTimeout(() => {
        module.task('testTask', {hi: "World"})
      }, 200)
    })
  })

  describe("Auto clean", () => {
    before(() => {
      module = makeWorkerQueue()
    })

    it("Should have a default auto clean interval of 60000", () => {
      module.config.cleanInterval.should.equal(3600000)
    })

    it("Should auto clean based on user supplied cleanInterval", () => {
      app.config['worker-queue'] = {cleanInterval: 500}
      module = makeWorkerQueue()
      module.cleanAll = sinon.spy()
      setTimeout(() => {
        module.cleanAll.called().should.be.true
        module.cleanAll.calledWith('failed').should.be.true
      })
    })
  })
})

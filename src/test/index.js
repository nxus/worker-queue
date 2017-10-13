/* 
* @Author: Mike Reich
* @Date:   2016-02-13 08:59:44
* @Last Modified 2016-09-09
*/

'use strict'

import WorkerQueue from '../'

import {application as app} from 'nxus-core'

import sinon from 'sinon'

describe("Worker Queue", () => {
  var module
 
  beforeEach(function() {
    this.timeout(3000)
  })
  
  describe("Load", () => {
    it("should not be null", () => WorkerQueue.should.not.be.null)

    it("should be instantiated", () => {
      module = new WorkerQueue()
      module.should.not.be.null
    })
  })

  describe("Init", () => {
    beforeEach(() => {
      module = new WorkerQueue()
      module._queues.should.not.be.null
    })
  })

  describe("Tasks", () => {
    beforeEach(() => {
      module = new WorkerQueue(app)
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
      module = new WorkerQueue()
    })

    it("Should have a default auto clean interval of 60000", () => {
      module.config.cleanInterval.should.equal(3600000)
    })

    it("Should auto clean based on user supplied cleanInterval", () => {
      app.config['worker-queue'] = {cleanInterval: 500}
      module = new WorkerQueue()
      module.cleanAll = sinon.spy()
      setTimeout(() => {
        module.cleanAll.called().should.be.true
        module.cleanAll.calledWith('failed').should.be.true
      })
    })
  })
})

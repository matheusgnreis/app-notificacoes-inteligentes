const axios = require('axios')

// read configured E-Com Plus app data
const getAppData = require('./../../lib/store-api/get-app-data')

const SKIP_TRIGGER_NAME = 'SkipTrigger'
const ECHO_SUCCESS = 'SUCCESS'
const ECHO_SKIP = 'SKIP'
const ECHO_API_ERROR = 'STORE_API_ERR'

exports.post = ({ appSdk }, req, res) => {
  // receiving notification from Store API
  const { storeId } = req

  /**
   * Treat E-Com Plus trigger body here
   * Ref.: https://developers.e-com.plus/docs/api/#/store/triggers/
   */
  const trigger = req.body

  // get app configured options
  getAppData({ appSdk, storeId })

    .then(appData => {
      if (
        Array.isArray(appData.ignore_triggers) &&
        appData.ignore_triggers.indexOf(trigger.resource) > -1
      ) {
        // ignore current trigger
        const err = new Error()
        err.name = SKIP_TRIGGER_NAME
        throw err
      }

      /* DO YOUR CUSTOM STUFF HERE */
      if (trigger.resource === 'orders' && trigger.action !== 'delete') {
        const orderId = trigger.resource_id
        if (orderId) {
          const url = appData.ni_webhook_uri
          console.log(`Trigger for Store #${storeId} ${orderId} => ${url}`)
          if (url) {
            console.log('> Sending order notification')
            appSdk.apiRequest(storeId, `orders/${orderId}.json`)
              .then(({ response }) => {
                return axios({
                  method: 'post',
                  url,
                  data: {
                    storeId,
                    trigger,
                    order: response.data
                  }
                })
              })
              .then(({ status }) => console.log(`> ${status}`))
              .catch(console.error)
          }
        }
      }

      // all done
      res.send(ECHO_SUCCESS)
    })

    .catch(err => {
      if (err.name === SKIP_TRIGGER_NAME) {
        // trigger ignored by app configuration
        res.send(ECHO_SKIP)
      } else {
        // console.error(err)
        // request to Store API with error response
        // return error status code
        res.status(500)
        const { message } = err
        res.send({
          error: ECHO_API_ERROR,
          message
        })
      }
    })
}

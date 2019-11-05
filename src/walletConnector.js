import WalletConnect from "@walletconnect/browser"
import { convertUtf8ToHex } from '@walletconnect/utils'
import WalletConnectQRCodeModal from "@walletconnect/qrcode-modal"
let callback = null

class WalletConnector {
    constructor(_authRoute, _prefix, _callback) {
      this.AUTH_ROUTE = _authRoute
      this.PREFIX = _prefix
      callback = _callback
      this.accounts = null
      this.CONTRACT_ADDR = null
      // Create a walletConnector
      this.walletConnector = new WalletConnect({
        bridge: "https://bridge.walletconnect.org" // Required
      })

      // Subscribe to connection events
      this.walletConnector.on("connect", (error, payload) => {
        if (error) {
          throw error
        }

        // Close QR Code Modal
        WalletConnectQRCodeModal.close()

        // Get provided accounts and chainId
        const { accounts, chainId } = payload.params[0]
        this.accounts = accounts
        this.signPersonalMessage()
      })

      this.walletConnector.on("session_update", (error, payload) => {
        if (error) {
          throw error
        }

        // Get updated accounts and chainId
        const { accounts, chainId } = payload.params[0]
        this.accounts = accounts
      })

      this.walletConnector.on("disconnect", (error, payload) => {
        if (error) {
          throw error
        }

        // Delete walletConnector
      })
    }

    loginWithConnector(contractAddr = null) {
      this.CONTRACT_ADDR = contractAddr
      if (!this.walletConnector.connected) {
          this.walletConnector.createSession().then(() => {
              const uri = this.walletConnector.uri
              WalletConnectQRCodeModal.open(uri, () => {
                  console.log("QR Code Modal closed")
              })
          })
      }

      else return this.signPersonalMessage()
    }

    signPersonalMessage() {
      const address = this.CONTRACT_ADDR ? this.CONTRACT_ADDR : this.accounts[0]
      return fetch(this.AUTH_ROUTE + '/' + address, { headers: { 'user-target': 'WalletConnect' }, method: 'get' }).then(res => {
          return res.text()
      })
      .then(message => {
        const data = this.PREFIX + message
        const msgParams = [
          convertUtf8ToHex(data),
          '0xbc28ea04101f03ea7a94c1379bc3ab32e65e62d3' // Required
        ]

        // Sign Typed Data
        this.walletConnector
          .signPersonalMessage(msgParams)
          .then(signature => {
            if (message !== null && signature !== null) {
                return fetch(this.AUTH_ROUTE + '/' + message + '/' + signature, { headers: { 'user-target': 'WalletConnect' }, method: 'post' })
                .then((res) => { return res.text() })
                .then((res) => {
                    this.walletConnector.killSession()
                    callback()
                })
                .catch((err) => { callback() })
            }
            return console.error('Missing arguments')
          })
          .catch(error => {
            // Error returned when rejected
            console.error(error)
          })
      })
    }
}


export default WalletConnector

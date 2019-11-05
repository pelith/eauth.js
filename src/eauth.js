import WalletConnector from './walletConnector'

class Eauth {
    constructor(options) {
        this.OAUTH_CLIENT_ID = options.OAUTH_CLIENT_ID
        this.OAUTH_URL = options.OAUTH_URL
        this.OAUTH_REDIRECT_URI = options.OAUTH_REDIRECT_URI
        this.OAUTH_STATE = options.OAUTH_STATE

        this.AUTH_ROUTE = options.AUTH_ROUTE // domain + '/routeName'
        this.CONTRACT_AUTH_ROUTE = options.CONTRACT_AUTH_ROUTE // domain + '/routeName'
        this.REDIRECT_URI = options.REDIRECT_URI
        this.AUTH_RESPONSE = null
        this.PREFIX = options.PREFIX ? options.PREFIX : ''
    }

    oauthLogin() {
        window.location = `${this.OAUTH_URL}?client_id=${this.OAUTH_CLIENT_ID}&redirect_uri=${this.OAUTH_REDIRECT_URI}&response_type=code&state=${this.OAUTH_STATE}`
    }

    fortmaticLogin(callback = () => { window.location.reload() }) {
        const fm = new Fortmatic('pk_live_CC75CEEE7D7E8630')
        const fortmaticWeb3 = new Web3(fm.getProvider())
        fortmaticWeb3.currentProvider.enable()
        .then((accounts) => {
            this.authStart(fortmaticWeb3, accounts[0], callback)
        })
    }

    ethLogin(callback = () => { window.location.reload() }) {
        if (typeof web3 !== 'undefined') {
            console.log('web3 is detected.')
        } else {
            return alert('No web3 detected.')
        }

        web3.currentProvider.enable()
        .then((accounts) => {
            this.authStart(web3, accounts[0], callback)
        })
    }

    authStart(_web3, account, callback) {
        if (!/^(0x)?[0-9a-f]{40}$/i.test(account)) {
            return alert('Wallet not detected.')
        }

        return fetch(this.AUTH_ROUTE + '/' + account, { method: 'get' }).then(res => {
            return res.text()
        })
        .then(res => {
            let data = ''
            let message = null
            let method = 'eth_signTypedData'

            try {
                res = JSON.parse(res)
                message = res[1].value
                data = res
                data[1].value = this.PREFIX + res[1].value
            } catch (e) {
                message = res
                const prefixedRes = this.PREFIX + res
                method = 'personal_sign'
                data = prefixedRes
            }

            if (!/^[a-fA-F0-9]+$/.test(message))
                return alert('Something went wrong, please try again later.')

            const params = [data, account]
            _web3.currentProvider.sendAsync({
                id: 1,
                method,
                params,
            }, (err, result) => {
                if (err) return console.error(err)
                if (result.error) return console.error(result.error)

                const signature = result.result

                if (message !== null && signature !== null) {
                    return fetch(this.AUTH_ROUTE + '/' + message + '/' + signature, { method: 'post' })
                    .then((res) => { return res.text() })
                    .then((res) => {
                        this.AUTH_RESPONSE = res
                        callback()
                    })
                    .catch((err) => { callback() })
                }
                return console.error('Missing arguments')
            })
        })
    }

    contractEthLogin(contractAddr, callback = () => { window.location.reload() }) {
        if (typeof web3 !== 'undefined') {
            console.log('web3 is detected.')
        } else {
            return alert('No web3 detected.')
        }

        web3.currentProvider.enable()
        .then((accounts) => {
            this.walletValidation(web3, contractAddr, accounts[0], callback)
        })
    }

    contractFortmaticLogin(contractAddr, callback = () => { window.location.reload() }) {
        const fm = new Fortmatic('pk_live_CC75CEEE7D7E8630')
        const fortmaticWeb3 = new Web3(fm.getProvider())
        fortmaticWeb3.currentProvider.enable()
        .then((accounts) => {
            this.walletValidation(fortmaticWeb3, contractAddr, accounts[0], callback)
        })
    }

    walletValidation(_web3, contractAddr, account, callback) {
        if (!/^(0x)?[0-9a-f]{40}$/i.test(contractAddr)) {
            return alert('Not a valid address.')
        }
        
        return fetch(this.CONTRACT_AUTH_ROUTE + '/' + contractAddr, { method: 'get' }).then(res => {
            return res.text()
        })
        .then(res => {
            let data = ''
            let message = null
            let method = 'eth_signTypedData'

            try {
                res = JSON.parse(res)
                message = res[1].value
                data = res
                data[1].value = this.PREFIX + res[1].value
            } catch (e) {
                message = res
                const prefixedRes = this.PREFIX + res
                method = 'personal_sign'
                data = prefixedRes
            }

            if (!/^[a-fA-F0-9]+$/.test(message))
                return alert('Something went wrong, please try again later.')

            const params = [data, account]
            _web3.currentProvider.sendAsync({
                id: 1,
                method,
                params,
            }, (err, result) => {
                if (err) return console.error(err)
                if (result.error) return console.error(result.error)

                const signature = result.result

                if (message !== null && signature !== null) {
                    return fetch(this.CONTRACT_AUTH_ROUTE + '/' + message + '/' + signature, { method: 'post' })
                    .then((res) => { return res.text() })
                    .then((res) => {
                        this.AUTH_RESPONSE = res
                        callback()
                    })
                    .catch((err) => { callback() })
                }
                return console.error('Missing arguments')
            })
        })
    }

    getMessage(contractAddr) {
        if (!/^(0x)?[0-9a-f]{40}$/i.test(contractAddr)) {
            return alert('Not a valid address.')
        }
        
        return fetch(this.CONTRACT_AUTH_ROUTE + '/' + contractAddr, { method: 'get' }).then(res => {
            return res.text()
        })
        .then(message => {
            if (!/^[a-fA-F0-9]+$/.test(message))
                return alert('Something went wrong, please try again later.')

            return this.PREFIX + message
        })
    }

    checkIsValid(message, signature, callback) {
        const token = message.replace(this.PREFIX, '')
        return fetch(this.CONTRACT_AUTH_ROUTE + '/' + token + '/' + signature, { method: 'post' }).then(res => {
            return res.text()
        })
        .then((res) => {
            this.AUTH_RESPONSE = res
            callback()
        })
        .catch((err) => { callback() })
    }

    walletConnect(callback = () => { window.location.reload() }) {
        const walletConnector = new WalletConnector(this.AUTH_ROUTE, this.PREFIX, callback)
        walletConnector.loginWithConnector()
    }
}


export default Eauth

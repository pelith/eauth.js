class Eauth {
    constructor(options) {
        this.OAUTH_CLIENT_ID = options.OAUTH_CLIENT_ID
        this.OAUTH_URL = options.OAUTH_URL
        this.OAUTH_REDIRECT_URI = options.OAUTH_REDIRECT_URI
        this.OAUTH_STATE = options.OAUTH_STATE

        this.AUTH_ROUTE = options.AUTH_ROUTE // domain + '/routeName'
        this.REDIRECT_URI = options.REDIRECT_URI
        this.AUTH_RESPONSE = null
    }

    oauthLogin() {
        window.location = `${this.OAUTH_URL}?client_id=${this.OAUTH_CLIENT_ID}&redirect_uri=${this.OAUTH_REDIRECT_URI}&response_type=code&state=${this.OAUTH_STATE}`
    }

    fortmaticLogin(callback = () => { window.location.reload() }) {
        const fm = new Fortmatic('pk_live_CC75CEEE7D7E8630')
        const fortmaticWeb3 = new Web3(fm.getProvider())
        fortmaticWeb3.currentProvider.enable()
            .then(() => {
                this.authStart(fortmaticWeb3, callback)
            })
    }

    ethLogin(callback = () => { window.location.reload() }) {
        if (typeof web3 !== 'undefined') {
            console.log('web3 is detected.')
        } else {
            return alert('No web3 detected.')
        }

        if (web3.currentProvider.enable) {
            web3.currentProvider.enable()
                .then(() => {
                    if (web3.eth.accounts[0] === undefined) {
                        return alert('Please login your wallet extension first.')
                    }
                    this.authStart(web3, callback)
                })
        } else if (web3.eth.accounts[0]) {
            this.authStart(web3, callback)
        }
    }

    authStart(_web3, callback) {
        return fetch(this.AUTH_ROUTE + '/' + _web3.eth.accounts[0], { method: 'get' }).then(res => {
            return res.text()
        })
        .then(res => {
            let data = ''
            let message = ''
            let method = 'eth_signTypedData'

            try {
                res = JSON.parse(res)
                data = res
                message = res[1].value
            } catch (e) {
                method = 'personal_sign'
                data = '0x' + Array.from(res).map(x => x.charCodeAt(0).toString(16)).join('')
                message = res
            }

            // Call wallet extension to sign
            const from = _web3.eth.accounts[0]
            const params = [data, from]
            _web3.currentProvider.sendAsync({
                id: 1,
                method,
                params,
            }, async (err, result) => {
                if (err) return console.error(err)
                if (result.error) return console.error(result.error)

                const signature = result.result

                if (message !== null && signature !== null) {
                    return fetch(this.AUTH_ROUTE + '/' + message + '/' + signature, { method: 'post' })
                    .then((res) => { return res.json() })
                    .then((res) => {
                        this.AUTH_RESPONSE = res
                        callback()
                    })
                }
                return console.error('Missing arguments')
            })
        })
    }
}


export default Eauth

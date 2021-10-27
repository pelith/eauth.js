type Options = {
  OAUTH_CLIENT_ID: string;
  OAUTH_URL: string;
  OAUTH_REDIRECT_URI: string;
  OAUTH_STATE: string;
  ENS_ROUTE: string;
  AUTH_ROUTE: string;
  CONTRACT_AUTH_ROUTE: string;
  REDIRECT_URI: string;
  AUTH_RESPONSE: string;
  PREFIX: string;
};

class Eauth {
  OAUTH_CLIENT_ID: string;
  OAUTH_URL: string;
  OAUTH_REDIRECT_URI: string;
  OAUTH_STATE: string;
  ENS_ROUTE: string;
  AUTH_ROUTE: string;
  CONTRACT_AUTH_ROUTE: string;
  REDIRECT_URI: string;
  AUTH_RESPONSE: string | null;
  ERROR: any;
  PREFIX: string;

  constructor(options: Options) {
    this.OAUTH_CLIENT_ID = options.OAUTH_CLIENT_ID;
    this.OAUTH_URL = options.OAUTH_URL;
    this.OAUTH_REDIRECT_URI = options.OAUTH_REDIRECT_URI;
    this.OAUTH_STATE = options.OAUTH_STATE;

    this.ENS_ROUTE = options.ENS_ROUTE; // domain + '/routeName'
    this.AUTH_ROUTE = options.AUTH_ROUTE; // domain + '/routeName'
    this.CONTRACT_AUTH_ROUTE = options.CONTRACT_AUTH_ROUTE; // domain + '/routeName'
    this.REDIRECT_URI = options.REDIRECT_URI;
    this.AUTH_RESPONSE = null;
    this.PREFIX = options.PREFIX ? options.PREFIX : '';
  }

  submitENS(ens: string) {
    if (!/.*\.eth$/.test(ens)) {
      throw Error('ENS names should end with \'.eth\'.');
    }

    return fetch(this.ENS_ROUTE + '/' + ens, { method: 'post' })
      .then(res => {
        return res.json();
      })
      .then(result => {
        if (!result.success) {
          throw Error(result.message);
        }

        return result;
      });
  }

  oauthLogin() {
    window.location.href = `${this.OAUTH_URL}?client_id=${this.OAUTH_CLIENT_ID}&redirect_uri=${this.OAUTH_REDIRECT_URI}&response_type=code&state=${this.OAUTH_STATE}`;
  }

  ethLogin(
    provider: any,
    callback: () => void = () => {
      window.location.reload();
    }
  ) {
    provider.enable().then((accounts: string[]) => {
      this.authStart(provider, accounts[0], callback);
    });
  }

  authStart(provider: any, account: string, callback: () => void) {
    if (!/^(0x)?[0-9a-f]{40}$/i.test(account)) {
      this.ERROR = 'Not a valid address.';
      return callback();
    }
    return fetch(this.AUTH_ROUTE + '/' + account, {
        headers: {
          'chainid': parseInt(provider.chainId)+'',
        },
        method: 'get'
      })
      .then(res => {
        return res.text();
      })
      .then(res => {
        const resJson = JSON.parse(res);
        const method = 'eth_signTypedData_v4';
        const { banner, token } = resJson?.message;

        const structure = {
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            Eauth: [
              { name: 'banner', type: 'string' },
              { name: 'message', type: 'string' },
              { name: 'token', type: 'string' },
            ],
          },
          primaryType: 'Eauth',
          domain: {
            name: 'Eauth',
            version: '1',
            chainId: parseInt(provider.chainId),
            verifyingContract: '0x0000000000000000000000000000000000000000',
          },
          message: {
            banner: banner,
            message: this.PREFIX,
            token: token,
          },
        };

        const params = [account, JSON.stringify(structure)];
        provider.sendAsync(
          {
            id: 1,
            method,
            params,
          },
          (err: any, result: { error: any; result: string }) => {
            if (err || result.error) {
              this.ERROR = err || result.error;
              return callback();
            }

            const signature = result.result;

            if (token !== null && signature !== null) {
              return fetch(this.AUTH_ROUTE + '/' + token + '/' + signature, {
                headers: {
                  'chainid': parseInt(provider.chainId)+'',
                },
                method: 'post',
              })
                .then(res => {
                  return res.text();
                })
                .then(res => {
                  this.AUTH_RESPONSE = res;
                  callback();
                });
            } else {
              this.ERROR = 'Missing arguments';
              return callback();
            }
          }
        );
      });
  }

  contractEthLogin(
    provider: any,
    contractAddr: string,
    callback: () => void = () => {
      window.location.reload();
    }
  ) {
    provider.enable().then((accounts: string) => {
      this.walletValidation(provider, contractAddr, accounts[0], callback);
    });
  }

  walletValidation(
    provider: any,
    contractAddr: string,
    account: string,
    callback: () => void
  ) {
    if (!/^(0x)?[0-9a-f]{40}$/i.test(contractAddr)) {
      this.ERROR = 'Not a valid address.';
      return callback();
    }

    return fetch(this.CONTRACT_AUTH_ROUTE + '/' + contractAddr, {
      method: 'get',
    })
      .then(res => {
        return res.text();
      })
      .then((res: string) => {
        let data: any = '';
        let message: any = null;
        let method = 'eth_signTypedData';

        data = JSON.parse(res);
        message = data[1].value;
        data[1].value = this.PREFIX + message;

        if (!/^[a-fA-F0-9]+$/.test(message)) {
          this.ERROR = 'Message error, please try again.';
          return callback();
        }

        const params = [data, account];
        provider.sendAsync(
          {
            id: 1,
            method,
            params,
          },
          (err: any, result: { error: string; result: string }) => {
            if (err || result.error) {
              this.ERROR = err || result.error;
              return callback();
            }

            const signature = result.result;

            if (message !== null && signature !== null) {
              return fetch(
                this.CONTRACT_AUTH_ROUTE + '/' + message + '/' + signature,
                {
                  method: 'post',
                }
              )
                .then(res => {
                  return res.text();
                })
                .then(res => {
                  this.AUTH_RESPONSE = res;
                  callback();
                });
            } else {
              this.ERROR = 'Missing arguments';
              return callback();
            }
          }
        );
      });
  }

  getMessage(contractAddr: string) {
    if (!/^(0x)?[0-9a-f]{40}$/i.test(contractAddr)) {
      throw Error('Not a valid address.');
    }

    return fetch(this.CONTRACT_AUTH_ROUTE + '/' + contractAddr, {
      method: 'get',
    })
      .then(res => {
        return res.text();
      })
      .then(message => {
        if (!/^[a-fA-F0-9]+$/.test(message))
          throw Error('Something went wrong, please try again later.');

        return this.PREFIX + message;
      });
  }

  checkIsValid(message: string, signature: string, callback: () => void) {
    const token = message.replace(this.PREFIX, '');
    return fetch(this.CONTRACT_AUTH_ROUTE + '/' + token + '/' + signature, {
      method: 'post',
    })
      .then(res => {
        return res.text();
      })
      .then(res => {
        this.AUTH_RESPONSE = res;
        callback();
      });
  }
}

export default Eauth;

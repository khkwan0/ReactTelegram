import logo from './logo.svg';
import './App.css';
import TdClient from 'tdweb_1.8.44/dist/tdweb';
import React from 'react'
import {config} from './config.js'

let client = new TdClient({readOnly: false, logVerbosityLevel: 1, fastUpdating: true, jsLogVerbosityLevel: 1, useDatabase: false, mode: 'wasm', isBackground: false})

function App() {
  const [showTelephoneInput, setShowTelephoneInput] = React.useState(false)
  const [telephone, setTelephone] = React.useState('')
  const [showCodeInput, setShowCodeInput] = React.useState(false)
  const [code, setCode] = React.useState('')
  const [ready, setReady] = React.useState(false)
  const [botname, setBotname] = React.useState('')
  const [error, setError] = React.useState('')
  const [token, setToken] = React.useState('')
  const [botLink, setBotLink] = React.useState('')
  
  const botnameRef = React.useRef('')

  React.useEffect(() => {
    botnameRef.current = botname
  }, [botname])

  React.useEffect(() => {
    client.onUpdate = async update => {
      try {

      // console.log('update', update)
      if (update.error) {
        console.error(update.error)
      }
      if (update['@type'] === 'updateAuthorizationState') {
        const authState = update.authorization_state['@type']
        console.log('authState: ', authState)
        if (authState === 'authorizationStateWaitTdlibParameters') {
          send({
            '@type': 'setTdlibParameters',
            'use_test_dc': true,
            'api_id': config.REACT_APP_TELEGRAM_API_ID,
            'api_hash': config.REACT_APP_TELEGRAM_API_HASH,
            'system_language_code': 'en',
            'device_model': 'desktop',
            'application_version': '1',
            // 'use_proxy': true,
            /*
            parameters: {
              'database_directory': './tdlib',
              'database_encryption_key': new TextEncoder().encode("my-secret-key-1234"),
              'system_language_code': 'en',
              'device_model': 'desktop',
              'application_version': '1',
              'enable_storage_optimizer': true,
              'ignore_file_names': true,
              'use_message_database': true,
              'use_secret_chats': true,
              'use_test_dc': false,
              'use_live_location': true,
            }
              */
          })
        }
        else if (authState === 'authorizationStateWaitEncryptionKey') {
          send({
            '@type': 'checkDatabaseEncryptionKey',
          })
        } else if (authState === 'authorizationStateWaitPhoneNumber') {
          setShowTelephoneInput(true)
        } else if (authState === 'authorizationStateWaitCode') {
          setShowCodeInput(true)
        } else if (authState === 'authorizationStateReady') {
          setReady(true)
        } else if (authState === 'authorizationStateLoggingOut') {
          send({
            '@type': 'close'
          })
        } else if (authState === 'authorizationStateClosed') {
          setShowTelephoneInput(true)
        /*
          client = new TdClient({readOnly: false, logVerbosityLevel: 1, fastUpdating: true, jsLogVerbosityLevel: 1, useDatabase: false, mode: 'wasm', isBackground: false})
          send({
            '@type': 'setTdlibParameters',
            'api_id': config.REACT_APP_TELEGRAM_API_ID,
            'api_hash': config.REACT_APP_TELEGRAM_API_HASH,
            'system_language_code': 'en',
            'device_model': 'desktop',
            'application_version': '1',
          })
          */
          send({
            '@type': 'getAuthorizationState',
          })
        }
      } else if (update['@type'] === 'updateNewMessage') {
        const message = update.message
        if (message.content['@type'] === 'messageText') {
          const theMessage = message.content.text.text
          console.log(theMessage)
          if (theMessage === 'Alright, a new bot. How are we going to call it? Please choose a name for your bot.') {
            console.log('sending name', botnameRef.current)
            send({
              '@type': 'sendMessage',
              chat_id: message.chat_id,
              input_message_content: {
                '@type': 'inputMessageText',
                text: {
                  '@type': 'formattedText',
                  text: botnameRef.current
                }
              }
            })
          } else if (theMessage === 'Good. Now let\'s choose a username for your bot. It must end in `bot`. Like this, for example: TetrisBot or tetris_bot.') {
            console.log('sending username', botnameRef.current + '_bot')
            send({
              '@type': 'sendMessage',
              chat_id: message.chat_id,
              input_message_content: {
                '@type': 'inputMessageText',
                text: {
                  '@type': 'formattedText',
                  text: botnameRef.current + '_bot'
                }
              }
            })
          } else if (theMessage.includes('Sorry, this username is already taken. Please try something different')) {
            setError(theMessage)
          } else if (theMessage.includes('Done! Congratulations')) {
            const _token = parseToken(theMessage)
            if (_token !== -1) {
              const res = await saveToken(_token, botnameRef.current)
              if (res.status === 200) {
                setBotLink('https://t.me/' + botnameRef.current + '_bot')
              }
            } else {
              setError('Error parsing token')
            }
          }
        }
      }
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  async function saveToken(_token, botname) {
    try {
      if (_token) {
        const res = await fetch('https://k.lillo.ai/api/telegram/newagent', {
          method: 'POST',
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            botName: botname,
            botUsername: botname + '_bot',
            token: _token,
          })
        })
        return await res.json()
      }
    } catch (e) {
      console.error(e)
      return null
    }
  }

  function parseToken(msg) {
    const key1 = 'Use this token to access the HTTP API:'
    const key2 = 'Keep your token secure and store it safely'
    const index1 = msg.indexOf(key1)
    const index2 = msg.indexOf(key2)
    if (index1 < 0) {
      return -1
    } else if (index2 < 0) {
      return -1
    } else {
      const start = index1 + key1.length + 1
      const finish = index2 - 1
      return msg.substring(start, finish)
    }
  }
  async function send(request) {
    console.log('send request: ', request)
    client.send(request)
  }

  async function sendToBotFather() {
    setError('')
    // 1. Search for BotFather
    const botFather = await client.send({
      '@type': 'searchPublicChat',
      username: 'BotFather'
    });
    
    // 2. Create private chat
    const chat = await client.send({
      '@type': 'createPrivateChat',
      user_id: botFather.id || 93372553,
      force: true
    });

    // 3. Send message
    send({
      '@type': 'sendMessage',
      chat_id: chat.id,
      input_message_content: {
        '@type': 'inputMessageText',
        text: {
          '@type': 'formattedText',
          text: '/newbot'  // Your command here
        }
      }
    });
  }

  React.useEffect(() => {
    send({
      '@type': 'getOption',
      'name': 'version',
    })
  }, [])

  async function handlePhoneNumber() {
    console.log(telephone)
    if (telephone.length > 5) {
      send({
        '@type': 'setAuthenticationPhoneNumber',
        phone_number: telephone,
        allow_flash_call: true,
        is_current_phone_number: true,
      })
    }
  }

  async function handleCode() {
    console.log(code)
    if (code.length > 4) {
      send({
        '@type': 'checkAuthenticationCode',
        code: code
      })
    }
  }

  async function handleLogout() {
    send({
      '@type': 'logOut'
    })
  }

  return (
    <div className="App">
      <header className="App-header">
        <input type="text" value={telephone} disabled={!showTelephoneInput} placeholder="Enter your phone number" onChange={(e) => setTelephone(e.target.value)}/>
        <button onClick={handlePhoneNumber}>
          Check
        </button>
        <input type="text" value={code} disabled={!showCodeInput} placeholder="Enter the code" onChange={(e) => setCode(e.target.value)}/>
        <button onClick={handleCode}>
          Check
        </button>
        {error && (
          <div>
            <h1>Error</h1>
            <p>{error}</p>
          </div>
        )}
        {ready && (
          <div>
            <h1>Ready</h1>
            <input type="text" value={botname} placeholder="Enter the name of your agent" onChange={(e) => setBotname(e.target.value)}/>
            <button onClick={sendToBotFather}>
              Send
            </button>
          </div>
        )}
        {botLink && (
          <div>
            <h1>New agent:</h1>
            <p>{botLink}</p>
          </div>
        )}

        <button onClick={handleLogout}>
          Logout
        </button>

        <img src={logo} className="App-logo" alt="logo" />
      </header>
    </div>
  );
}

export default App;

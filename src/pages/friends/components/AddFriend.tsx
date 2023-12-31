import styles from '../friends.module.scss'

import { useEffect, useState, useRef, useCallback, ChangeEvent, KeyboardEvent, MouseEvent } from 'react'
import { socket } from '@/utils/socket'
import { useFriendsCtx } from '@/contexts'
import { useNotifications } from '@/hooks'
import { customFetch } from '@/utils/services'
import type { FriendRequest, User } from '@/utils/types'
import { BsX } from 'react-icons/bs'
import { FaCheck } from 'react-icons/fa'
import { HiOutlineUser } from 'react-icons/hi'

type UserPreview = Pick<User, 'id' | 'name' | 'userName' | 'email' | 'avatarUrl'>

export default function AddFriend({user}: {
  user: User
}){
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const searcherRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [wrappingRef, setWrappingRef] = useState<HTMLDivElement | null>(null)
  const [resultsListRef, setResultsListRef] = useState<HTMLDivElement | null>(null)
  const [users, setUsers] = useState<UserPreview[]>([])
  const [resultsUsers, setResultsUsers] = useState<UserPreview[]>([])
  const [selectedUsers, setSelectedUsers] = useState<UserPreview[]>([])
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null)
  const [openList, setOpenList] = useState(false)
  const [message, setMessage] = useState('')
  const { setRequests } = useFriendsCtx()
  const { createNotification } = useNotifications()

  useEffect(()=> {
    if(!users.length){
      customFetch('users?preview=true').then(res=> {
  
        if(res.length){
          let filteredUsers: UserPreview[] = res.filter((f: UserPreview)=> f.id != user.id ? !user.friends.some(s=> s == f.id) : false)

          const sortUsers = (a: UserPreview, b: UserPreview) => {
            if(a.userName == b.userName) return 0
            else if(a.userName > b.userName) return 1
            else return -1
          }

          customFetch('friends/requests').then((resR: FriendRequest[])=> {
            filteredUsers = filteredUsers.filter(f=> !resR.some(s=> s.sender.id == f.id || s.receiver.id == f.id))
            setUsers(filteredUsers)
            setResultsUsers(filteredUsers.sort(sortUsers))

          }).catch(()=> {
            setUsers(filteredUsers)
            setResultsUsers(filteredUsers.sort(sortUsers))
          })
        }
      }).catch(()=> console.error('Error in get all users names'))
    }

  }, [])
  
  useEffect(()=> {
    if(inputRef) inputRef.focus()
  }, [inputRef])

  // const handleHeight = () => {
  //   if(wrappingRef){
  //     const subContainer = wrappingRef.childNodes.item(0) as HTMLElement
  //     setTimeout(()=> {
  //       wrappingRef.style.height = subContainer.clientHeight + 'px'
  //     }, 100)
  //   }
  // }

  useEffect(()=> {
    if(resultsListRef){
      const maxHeight = 305
      const subContainer = resultsListRef.childNodes.item(0) as HTMLElement
      const subHeight = subContainer.clientHeight
      setTimeout(()=> {
        const height = (subHeight > maxHeight ? maxHeight : subHeight)
        resultsListRef.style.height = height + 'px'
        resultsListRef.style.borderTop = '1px solid var(--Border-color)' 
        
        if(wrappingRef && sectionRef.current) {
          // console.log(sectionRef.current.clientHeight+height)
          wrappingRef.style.height = sectionRef.current.clientHeight + height + 'px'
        }
      }, 100) 

    }
  }, [resultsListRef])

  useEffect(()=> {
    if(wrappingRef && sectionRef.current){

      const observer = new MutationObserver((mutations)=> {
        mutations.forEach((mutation)=> {
          if(mutation.type === 'childList') {
            setTimeout(()=> {
              if(sectionRef.current) {
                // console.log(sectionRef.current.clientHeight)
                wrappingRef.style.height = sectionRef.current.clientHeight + 'px'
              }
            }, 500)

            // console.log('Un componente HTML ha aparecido o desaparecido')
          }
        })
      })
  
      const options: MutationObserverInit = {
        childList: true,
        subtree: true
      }
  
      observer.observe(wrappingRef, options)
  
      return ()=> {
        observer.disconnect()
      }
    }
  }, [wrappingRef])

  const handleChange = useCallback(({currentTarget}: ChangeEvent<HTMLInputElement>) => {
    const value = currentTarget.value.trim()

    if(users.length && value){
      const results = users.filter(f=> {
        const target = f.userName.toLowerCase()
  
        return target == value || target.includes(value)
      }).sort((a,b)=> {
        if(a.userName == b.userName) return 0
        else if(a.userName > b.userName) return 1
        else return -1
      })

      setResultsUsers(results)
    }else if(!value) setResultsUsers([])
    
  }, [users])

  const handleFocus = () => {
    setOpenList(true)
  }

  const handleKeyUp = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if(textAreaRef.current) {
      const textAreaStyle = textAreaRef.current.style
      textAreaStyle.height = `28px`
      const scHeight = event.currentTarget.scrollHeight, newHeight = `${scHeight}px`
      if(textAreaStyle.height != newHeight){
        textAreaStyle.height = newHeight
      }
    }
  }, [])

  const handleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if(!searcherRef.current?.contains(e.target as Node) && openList) {
      if(resultsListRef){
        const height = resultsListRef.clientHeight
        
        resultsListRef.style.height = ''
        setTimeout(()=> {
          resultsListRef.style.borderTop = '' 
        }, 400)

        if(wrappingRef && sectionRef.current) {
          // console.log(sectionRef.current.clientHeight - resultsListRef.clientHeight)
          wrappingRef.style.height = sectionRef.current.clientHeight - height + 'px'
        }
      }
      setTimeout(()=> {
        setOpenList(false) 
      }, 500)
    }
  }, [openList, resultsListRef])

  const handleChangeMessage = useCallback(({currentTarget: {value}}: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(value)
  }, [])

  const submitRequests = async () => {
    const newRequestsIds: string[] = []
    for(let u of selectedUsers){
      const newRequest = await customFetch('friends/requests', 'POST', {
        receiverId: u.id,
        message: message.trim() || undefined
      })

      if(newRequest.id) newRequestsIds.push(newRequest.id)
    }

    const s = newRequestsIds.length != 1 ? 's' : ''

    createNotification({
      type: 'success',
      mute: true,
      content: `${newRequestsIds.length} solicitude${s} de amistad enviada${s}`
    })
    
    customFetch('friends/requests').then(res=> {
      if(res.length) {
        setRequests(res)
        res.filter((f: FriendRequest)=> newRequestsIds.some(s=> s == f.id)).forEach((r: FriendRequest) => {
          socket.emit('friendRequestCreate', r)
        })
      }
    }).catch(()=> console.error('Error in get new requests'))

    setSelectedUsers([])
    setResultsUsers([])
    setMessage('')
    if(inputRef) inputRef.value = ''
  }

  return (
    <div ref={setWrappingRef} className={styles.wrapping}>
      <div ref={sectionRef} onClick={handleClick} className={styles.section}>
        <div className={styles['addFriend-texts']}>
          <strong>
            !Busca a tu o tus amigos y envíales una solicitud de amistad¡
          </strong>
        </div>

        <div ref={searcherRef} className={styles.section_searcher}>
          <div className={styles['section_searcher-input']}>
            {Boolean(selectedUsers.length) &&
              <ul className={styles['section_searcher-selecteds']}>
                {selectedUsers.map(u=> {
                  const removeSelected = () => {
                    const updatedList = selectedUsers.slice()
                    updatedList.splice(updatedList.findIndex(f=> f.id == u.id), 1)
                    setSelectedUsers(updatedList)

                    setTimeout(()=> {
                      if(wrappingRef && sectionRef.current) {
                        wrappingRef.style.height = sectionRef.current.clientHeight + 'px'
                      }
                    }, 100)
                  }
                  
                  return (<li key={u.id}>
                    <p>{u.userName}</p>
                    <BsX onClick={removeSelected} />
                  </li>)
                })}
              </ul>
            }
            <input ref={setInputRef} onFocus={handleFocus} onChange={handleChange} type="search" placeholder='Busca un amigo' />
          </div>

          {Boolean(openList && resultsUsers.length) && <div ref={setResultsListRef} className={styles['section_searcher-results']}>
            <ul className={styles['section_searcher-results-list']} >
              {resultsUsers.map(m=> {
                const addUserSelected = () => {
                  if(selectedUsers.some(s=> s.id == m.id)){
                    const updatedSelecteds = selectedUsers.slice()
                    updatedSelecteds.splice(updatedSelecteds.findIndex(f=> f.id == m.id), 1)
                    setSelectedUsers(updatedSelecteds)

                  }else{
                    setSelectedUsers([...selectedUsers, m])

                  }
                  setTimeout(()=> {
                    if(wrappingRef && sectionRef.current) {
                      wrappingRef.style.height = sectionRef.current.clientHeight + 'px'
                    }
                  }, 100)
                }

                return (<li key={m.id} className={styles['section_searcher_result']} onClick={addUserSelected}>
                  <div className={styles['section_searcher_result-info']}>
                    <div >
                      {m.avatarUrl ?
                        <img src={m.avatarUrl} alt={m.userName} width={36} height={36} /> :
                        <HiOutlineUser />
                      }  
                    </div>

                    <div>
                      <strong>{m.userName}</strong>
                      <p>{m.name}</p>
                    </div>
                  </div>

                  <div className={`${styles['section_searcher_result-check']} ${selectedUsers.some(s=> s.id == m.id) ? styles.selected : ''}`}>
                    <FaCheck />
                  </div>
                </li>)
              })}
            </ul>
          </div>}
        </div>

        {Boolean(selectedUsers.length) &&
          <>
            <div className={styles['section-texts']}>
              <p>Puedes agregar un mensaje en tu solicitud, puede ser un mensaje para que tu amigo te reconozca</p>
            </div>

            <div className={styles['section-message']}>
              <textarea ref={textAreaRef} onChange={handleChangeMessage} onKeyUp={handleKeyUp} name="message" id="message" maxLength={250} ></textarea>
              <p>{message.length}/250</p>
            </div>
          </>
        }

        <button onClick={submitRequests} className={`${styles['section-button']} ${selectedUsers.length ? styles.enabled : ''}`}>Enviar solicitud{selectedUsers.length > 1 ? 'es' : ''}</button>
      </div>
    </div>
  )
}
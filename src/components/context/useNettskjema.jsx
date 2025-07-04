import { useState, useEffect, useRef } from 'react'
import authFunctions from "./authenticate"
import { useAuthDispatch } from "./AuthProviderContext.jsx"

export function useNettskjema () {

    const hasTicketRef = useRef(false)
    const dispatch = useAuthDispatch()

    if (urlContainsTicket()) {
      hasTicketRef.current = true} 

    useEffect(() => {
      const fetchTicket = async () => {
        if (hasTicketRef.current) {
            try {
                const ticketNumber = await authFunctions.getTicket()
                await dispatch({type: 'ticket', text: ticketNumber})
                const nettskjemaId = await authFunctions.zammad(ticketNumber)
                const nettskjemaInfo = await authFunctions.nettskjema(nettskjemaId)
                const skjemaInfo = {contactFirstName: nettskjemaInfo.ContactInfo[0], 
                                     contactSurname: nettskjemaInfo.ContactInfo[1], 
                                     contactEmail: nettskjemaInfo.ContactInfo[2],
                                    custodionaFirstName: nettskjemaInfo.CustodianInfo[0],
                                    custodianSurname: nettskjemaInfo.CustodianInfo[1],
                                    custodianEmail: nettskjemaInfo.CustodianInfo[2],
                                    custodianORCID: nettskjemaInfo.CustodianInfo[3],
                                    dataTitle: nettskjemaInfo.DataInfo[0],
                                    briefSummary: nettskjemaInfo.DataInfo[1]}
                await dispatch({type: 'nettskjemaInfo', text: skjemaInfo})
            } catch (error) {console.error('Error fetching ticket:', error)}}}
      
      fetchTicket()

    }, [])
}

function urlContainsTicket () {
  const URL = window.location.href
  return (URL.includes('TicketNumber='))
}  
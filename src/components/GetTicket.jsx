import { useEffect } from 'react'

const GetTicketUrl = () => {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        console.log('params window url:', params)
        const ticketNumber = params.get('ticketNumber')

        if (ticketNumber) {
            //localStorage.setItem('ticketNumber', ticketNumber)
            sessionStorage.setItem('ticketNumber', ticketNumber);
            console.log('Fetched Ticket Number:', ticketNumber)
        } else {
            console.log('Ticket Number not found.')
        }
    }, [])

    return null
}

export default GetTicketUrl

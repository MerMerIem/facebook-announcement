import React, { createContext, useState, useContext } from 'react'

const RecoverPasswordContext = createContext()

export const useRecover = () => useContext(RecoverPasswordContext)

export const RecoverProvider = ({children}) => {
    const [otp, setOtp] = useState();

  return <RecoverPasswordContext.Provider value={{otp, setOtp}}>{children}</RecoverPasswordContext.Provider>
}
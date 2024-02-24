import { create, StateCreator } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"


export interface SessionKeyState {
    email?: string
    serializedSessionKeyAccount?: string

    update: (email: string, serializedSessionKeyAccount: string) => void
}

export const initialSessionKeyState = {}

const createSessionKeyStore: StateCreator<
    SessionKeyState,
    [["zustand/immer", never], ["zustand/devtools", never]],
    [],
    SessionKeyState
> = set => ({
    ...initialSessionKeyState,
    update: (email, serializedSessionKeyAccount) => {
        set(state => {
            state.email = email
            state.serializedSessionKeyAccount = serializedSessionKeyAccount
        })
    },
})

export const useSessionKeyStore = create(immer(devtools(createSessionKeyStore)))
export type SessionKeyStore = typeof useSessionKeyStore

import { create, StateCreator } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export interface SessionKeyState {
    serializedSessionKeyAccount?: string

    setSerializedSessionKeyAccount: (serializedSessionKeyAccount: string) => void
}

export const initialSessionKeyState = {}

const createSessionKeyStore: StateCreator<
    SessionKeyState,
    [["zustand/immer", never], ["zustand/devtools", never]],
    [],
    SessionKeyState
> = set => ({
    ...initialSessionKeyState,
    setSerializedSessionKeyAccount: (serializedSessionKeyAccount) => {
        set(state => {
            state.serializedSessionKeyAccount = serializedSessionKeyAccount
        })
    },
})

export const useSessionKeyStore = create(immer(devtools(createSessionKeyStore)))
export type SessionKeyStore = typeof useSessionKeyStore

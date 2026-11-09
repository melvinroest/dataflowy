import { createBrowserRouter } from 'react-router-dom'
import { GuestLayout } from '@/features/guest-editor/GuestLayout'
import { GuestDFDEditorPage } from '@/features/guest-editor/GuestDFDEditor'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <GuestLayout />,
    children: [{ index: true, element: <GuestDFDEditorPage /> }],
  },
])

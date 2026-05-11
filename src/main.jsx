import React from 'react'
import ReactDOM from 'react-dom/client'
import { inject } from '@vercel/analytics'
import PlateInventoryLookup from './PlateInventoryLookup'
import './index.css'

inject()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PlateInventoryLookup />
  </React.StrictMode>
)

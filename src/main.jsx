import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'
import { instalarManejoDeSesion } from './utils/sesion'

// Las pantallas que usan axios directo también vuelven al login si la sesión venció.
instalarManejoDeSesion(axios)

createRoot(document.getElementById('root')).render(
    <App />
)

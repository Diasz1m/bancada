import cors from 'cors'
import express from 'express'
import { requireAuth } from './auth.js'
import { AuthController } from './controllers/authController.js'
import { AiController } from './controllers/aiController.js'
import { TicketController } from './controllers/ticketController.js'
import { Database } from './database.js'
import { errorHandler, fail } from './http.js'

Database.boot()

const app = express()
const port = Number(process.env.PORT ?? 8001)

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  }),
)
app.use(express.json())

app.post('/api/login', AuthController.login)
app.post('/api/logout', requireAuth, AuthController.logout)
app.get('/api/me', requireAuth, AuthController.me)
app.get('/api/stats', requireAuth, TicketController.stats)
app.get('/api/tickets', requireAuth, TicketController.index)
app.post('/api/tickets', requireAuth, TicketController.store)
app.get('/api/tickets/:id', requireAuth, TicketController.show)
app.patch('/api/tickets/:id', requireAuth, TicketController.update)
app.post('/api/tickets/:id/comments', requireAuth, TicketController.comment)
app.get('/api/tickets/:id/ai', requireAuth, AiController.show)
app.post('/api/tickets/:id/ai', requireAuth, AiController.message)
app.post('/api/tickets/:id/ai/resolve', requireAuth, AiController.resolve)
app.post('/api/tickets/:id/ai/escalate', requireAuth, AiController.escalate)

app.use((_req, _res, _next) => {
  fail('Rota não encontrada.', 404)
})
app.use(errorHandler)

app.listen(port, () => {
  console.log(`API Node em http://localhost:${port}`)
})

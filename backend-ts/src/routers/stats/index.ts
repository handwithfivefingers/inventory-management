import { StatsController } from '#/controllers/stats'
import express from 'express'
const Router = express.Router()

Router.get('/dashboard', new StatsController().getDashboard)

export default Router

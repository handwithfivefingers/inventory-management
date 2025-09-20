import { WarehouseController } from '#/controllers/warehouse'
import express from 'express'
const route = express.Router()

route.get('/', new WarehouseController().get)
route.get('/:id', new WarehouseController().getWarehouseById)
route.post('/create', new WarehouseController().create)

export default route

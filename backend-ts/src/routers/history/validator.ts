import { idParam, validate } from '#/middleware/validate'

const historyIdValidation = validate([idParam('id')])

export { historyIdValidation }

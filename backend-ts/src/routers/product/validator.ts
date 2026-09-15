import { idParam, paginationQuery, validate, vendorIdQuery } from '#/middleware/validate'
import { body, query } from 'express-validator'

const productListValidation = validate([
  ...paginationQuery,
  vendorIdQuery('vendorId'),
  query('search').optional().isString().withMessage('search must be a string')
])

const productIdValidation = validate([idParam('id')])

const productVariantIdValidation = validate([idParam('id'), idParam('variantId')])

const productCreateValidation = validate([
  body('name').notEmpty().withMessage('name is required').bail().isString().withMessage('name must be a string').trim(),
  body('sku').optional().isString().withMessage('sku must be a string'),
  body('price').optional().isFloat({ min: 0 }).withMessage('price must be a number >= 0').toFloat(),
  body('categoryId').optional().isInt({ min: 1 }).withMessage('categoryId must be a positive integer').toInt(),
  body('unitId').optional().isInt({ min: 1 }).withMessage('unitId must be a positive integer').toInt(),
  body('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt()
])

const productUpdateValidation = validate([
  idParam('id'),
  body('name').optional().isString().withMessage('name must be a string').bail().notEmpty().withMessage('name must not be empty').trim(),
  body('code').optional({ nullable: true }).isString().withMessage('code must be a string').trim(),
  body('skuCode').optional({ nullable: true }).isString().withMessage('skuCode must be a string').trim(),
  body('description').optional({ nullable: true }).isString().withMessage('description must be a string'),
  body('image').optional({ nullable: true }).isString().withMessage('image must be a string'),
  body('type').optional().isInt({ min: 0, max: 2 }).withMessage('type must be 0 (simple), 1 (variant) or 2 (combo)').toInt(),
  body('unitId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('unitId must be a positive integer').toInt(),
  body('unit').optional({ nullable: true }).isInt({ min: 1 }).withMessage('unit must be a positive integer').toInt(),
  body('salePrice').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('salePrice must be a number >= 0').toFloat(),
  body('regularPrice').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('regularPrice must be a number >= 0').toFloat(),
  body('wholeSalePrice').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('wholeSalePrice must be a number >= 0').toFloat(),
  body('costPrice').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('costPrice must be a number >= 0').toFloat(),
  body('isNegative').optional().isBoolean().withMessage('isNegative must be a boolean').toBoolean(),
  body('quantity').optional({ nullable: true }).isFloat().withMessage('quantity must be a number').toFloat(),
  body('warehouseId').optional().isInt({ min: 1 }).withMessage('warehouseId must be a positive integer').toInt(),
  body('categories').optional().isArray().withMessage('categories must be an array'),
  body('tags').optional().isArray().withMessage('tags must be an array'),
  body('variants').optional().isArray().withMessage('variants must be an array'),
  body('variants.*.code').optional({ nullable: true }).isString().withMessage('variants[].code must be a string'),
  body('variants.*.skuCode').optional({ nullable: true }).isString().withMessage('variants[].skuCode must be a string'),
  body('variants.*.quantity').optional({ nullable: true }).isFloat().withMessage('variants[].quantity must be a number').toFloat(),
  body('removedVariantIds').optional().isArray().withMessage('removedVariantIds must be an array')
])

const attributeIdValidation = validate([idParam('attributeId')])

const attributeValueIdValidation = validate([idParam('valueId')])

const attributeCreateValidation = validate([
  body('name').notEmpty().withMessage('name is required').bail().isString().withMessage('name must be a string').trim(),
  body('type').optional().isString().withMessage('type must be a string'),
  body('vendorId').optional().isInt({ min: 1 }).withMessage('vendorId must be a positive integer').toInt()
])

const attributeUpdateValidation = validate([
  idParam('attributeId'),
  body('name').optional().isString().withMessage('name must be a string').trim()
])

const attributeValuesCreateValidation = validate([
  idParam('attributeId'),
  body('values')
    .exists({ checkNull: true })
    .withMessage('values is required')
    .bail()
    .isArray({ min: 1 })
    .withMessage('values must be a non-empty array'),
  body('values.*').notEmpty().withMessage('values[] must not be empty').bail().isString().withMessage('values[] must be strings')
])

const attributeValueUpdateValidation = validate([
  idParam('valueId'),
  body('value').notEmpty().withMessage('value is required').bail().isString().withMessage('value must be a string')
])

const productImportValidation = validate([
  query('warehouseId')
    .exists({ checkNull: true })
    .withMessage('warehouseId is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('warehouseId must be a positive integer')
    .toInt()
])

const productExportValidation = validate([vendorIdQuery('vendorId'), query('s').optional().isString()])

export {
  attributeCreateValidation,
  attributeIdValidation,
  attributeUpdateValidation,
  attributeValueIdValidation,
  attributeValuesCreateValidation,
  attributeValueUpdateValidation,
  productCreateValidation,
  productExportValidation,
  productIdValidation,
  productImportValidation,
  productListValidation,
  productUpdateValidation,
  productVariantIdValidation
}

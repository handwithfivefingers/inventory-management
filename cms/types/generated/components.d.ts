import type { Schema, Struct } from '@strapi/strapi';

export interface ComponentInformation extends Struct.ComponentSchema {
  collectionName: 'components_component_information';
  info: {
    displayName: 'Information';
  };
  attributes: {
    address: Schema.Attribute.Text;
    email: Schema.Attribute.Email;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    phone: Schema.Attribute.String;
  };
}

export interface ComponentInventory extends Struct.ComponentSchema {
  collectionName: 'components_component_inventories';
  info: {
    description: '';
    displayName: 'InventoryItem';
  };
  attributes: {
    quantity: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    warehouse: Schema.Attribute.Relation<
      'oneToOne',
      'api::warehouse.warehouse'
    >;
  };
}

export interface ComponentOrderItem extends Struct.ComponentSchema {
  collectionName: 'components_component_order_items';
  info: {
    description: '';
    displayName: 'OrderItem';
  };
  attributes: {
    note: Schema.Attribute.Text;
    price: Schema.Attribute.BigInteger;
    product: Schema.Attribute.Relation<'oneToOne', 'api::product.product'>;
    quantity: Schema.Attribute.Integer;
  };
}

export interface ComponentProductItem extends Struct.ComponentSchema {
  collectionName: 'components_component_product_items';
  info: {
    description: '';
    displayName: 'ProductItem';
  };
  attributes: {
    costPrice: Schema.Attribute.BigInteger;
    createdDate: Schema.Attribute.DateTime;
    regularPrice: Schema.Attribute.BigInteger;
    salePrice: Schema.Attribute.BigInteger;
    sold: Schema.Attribute.Integer;
    VAT: Schema.Attribute.Decimal;
    wholeSalePrice: Schema.Attribute.BigInteger;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'component.information': ComponentInformation;
      'component.inventory': ComponentInventory;
      'component.order-item': ComponentOrderItem;
      'component.product-item': ComponentProductItem;
    }
  }
}

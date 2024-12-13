

### FLOW CREATE PRODUCT
```json
-> When Create Product
--> Create Inventory base on all Warehouse and update quantity for current warehouse
--> Create Transfer with relationship productId and warehouseId. Update Quantity and type = "Input"
```


### FLOW UPDATE PRODUCT
```json
-> When Update Product
--> Update inventory quantity base on main warehouse select 
--> Create Transfer with relationship productId and warehouseId. Update Quantity and type = "Input" if quantity > 0 and "Output" if quantity < 0
```

### FLOW CREATE ORDER
```json
-> When CREATE ORDER
--> Create Order Item
---> Create Order Details base on Product 
---> Update inventory quantity base on main warehouse select 
---> Create Transfer with relationship productId and warehouseId. Update Quantity and type = "Input" if quantity > 0 and "Output" if quantity < 0
```



sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, MessageToast, MessageBox, Filter, FilterOperator, Sorter, Fragment) {
    "use strict";

    const API_BASE = "http://localhost:3000";

    return Controller.extend("ns.inventorymanagementui.controller.View1", {

        onInit: function () {
            this.getView().setModel(new JSONModel({
                products: [], totalItems: 0, lowStockCount: 0,
                outOfStockCount: 0, totalValueDisplay: "0", totalValueScale: "", categoryData: []
            }));
            this._editingId = null;
            this._oDialog   = null;
            this._loadProducts();
        },

        _loadProducts: function () {
            var oView = this.getView();
            oView.setBusy(true);
            fetch(API_BASE + "/products")
                .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
                .then(function (data) {
                    var products = data.map(function (item) {
                        return { id: item.id, ProductID: item.ProductID, ProductName: item.ProductName,
                            Category: item.Category, Stock: parseInt(item.Stock) || 0,
                            Price: parseFloat(item.Price) || 0,
                            LastUpdated: item.LastUpdated ? item.LastUpdated.split("T")[0] : "—" };
                    });
                    this._setModelData(products);
                    oView.setBusy(false);
                }.bind(this))
                .catch(function () {
                    oView.setBusy(false);
                    this._loadDemoData();
                }.bind(this));
        },

        _loadDemoData: function () {
            var products = [
                { id:1, ProductID:"P001", ProductName:"Laptop Dell XPS",    Category:"Electronics",    Stock:45,  Price:75000, LastUpdated:"2026-05-24" },
                { id:2, ProductID:"P002", ProductName:"Office Chair",        Category:"Furniture",      Stock:8,   Price:18000, LastUpdated:"2026-05-23" },
                { id:3, ProductID:"P003", ProductName:"Wireless Mouse",      Category:"Electronics",    Stock:120, Price:1200,  LastUpdated:"2026-05-25" },
                { id:4, ProductID:"P004", ProductName:"Steel Shelving Unit", Category:"Storage",        Stock:15,  Price:4500,  LastUpdated:"2026-05-19" },
                { id:5, ProductID:"P005", ProductName:"HP Laser Printer",    Category:"Electronics",    Stock:7,   Price:32000, LastUpdated:"2026-05-25" },
                { id:6, ProductID:"P006", ProductName:"Notebook A4 Pack",    Category:"Office Supplies",Stock:200, Price:350,   LastUpdated:"2026-05-20" },
                { id:7, ProductID:"P007", ProductName:"Monitor 27 4K",       Category:"Electronics",    Stock:18,  Price:35000, LastUpdated:"2026-05-22" },
                { id:8, ProductID:"P008", ProductName:"USB-C Hub 7-in-1",    Category:"Accessories",    Stock:60,  Price:2800,  LastUpdated:"2026-05-21" }
            ];
            this._setModelData(products);
            MessageToast.show("Demo mode — showing sample data");
        },

        _setModelData: function (products) {
            var totalValue = products.reduce(function (s, p) { return s + p.Stock * p.Price; }, 0);
            this.getView().getModel().setData({
                products: products, totalItems: products.length,
                lowStockCount:   products.filter(function (p) { return p.Stock > 0 && p.Stock < 10; }).length,
                outOfStockCount: products.filter(function (p) { return p.Stock === 0; }).length,
                totalValueDisplay: this._compact(totalValue),
                totalValueScale: totalValue >= 100000 ? "L" : totalValue >= 1000 ? "K" : "",
                categoryData: this._categoryData(products)
            });
            var oSync = this.byId("lastSyncText");
            if (oSync) oSync.setText("Last sync: " + new Date().toLocaleTimeString());
        },

        _categoryData: function (products) {
            var map = {};
            products.forEach(function (p) { var c = p.Category||"Others"; map[c]=(map[c]||0)+p.Stock; });
            return Object.keys(map).map(function (k) { return { Category:k, Stock:map[k] }; });
        },

        _compact: function (v) {
            if (v>=10000000) return (v/10000000).toFixed(1);
            if (v>=100000)   return (v/100000).toFixed(1);
            if (v>=1000)     return (v/1000).toFixed(1);
            return v.toFixed(0);
        },

        formatNumber: function (v) {
            if (v===undefined||v===null) return "0.00";
            return parseFloat(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
        },

        onToggleDarkMode: function (oEvent) {
            var oPage = this.byId("mainPage");
            if (oEvent.getParameter("state")) { oPage.addStyleClass("darkMode"); MessageToast.show("Dark Mode activated"); }
            else { oPage.removeStyleClass("darkMode"); MessageToast.show("Light Mode activated"); }
        },

        onRefresh: function () { this._loadProducts(); MessageToast.show("Refreshed"); },

        onSearch: function (oEvent) {
            this._applyFilters((oEvent.getParameter("newValue")||"").trim(), this.byId("categoryFilter").getSelectedKey());
        },
        onCategoryFilter: function () {
            this._applyFilters(this.byId("searchField").getValue().trim(), this.byId("categoryFilter").getSelectedKey());
        },
        _applyFilters: function (q, cat) {
            var ob = this.byId("inventoryTable").getBinding("items"); if (!ob) return;
            var f = [];
            if (q) f.push(new Filter({filters:[new Filter("ProductName",FilterOperator.Contains,q),new Filter("ProductID",FilterOperator.Contains,q),new Filter("Category",FilterOperator.Contains,q)],and:false}));
            if (cat) f.push(new Filter("Category",FilterOperator.EQ,cat));
            ob.filter(f.length ? new Filter({filters:f,and:true}) : []);
        },

        onOpenAddDialog: function () { this._editingId=null; this._openDialog("add",null); },

        _openDialog: function (sMode, oData) {
            var oView = this.getView();
            var p = this._oDialog ? Promise.resolve(this._oDialog)
                : Fragment.load({ id: oView.getId(), name: "ns.inventorymanagementui.view.AddProduct", controller: this })
                    .then(function (d) { this._oDialog=d; oView.addDependent(d); return d; }.bind(this));
            p.then(function (d) {
                this._resetForm();
                if (sMode==="edit" && oData) {
                    d.setTitle("Edit Product");
                    this.byId("inputNewID").setValue(oData.ProductID).setEditable(false);
                    this.byId("inputNewName").setValue(oData.ProductName);
                    this.byId("inputNewCategory").setValue(oData.Category);
                    this.byId("inputNewStock").setValue(oData.Stock);
                    this.byId("inputNewPrice").setValue(oData.Price);
                    this.byId("btnConfirmProduct").setText("Save Changes");
                } else {
                    d.setTitle("Add New Product");
                    this.byId("inputNewID").setEditable(true);
                    this.byId("btnConfirmProduct").setText("Add Product");
                }
                d.open();
            }.bind(this)).catch(function (e) { console.error(e); MessageBox.error("Dialog error:\n"+e.message); });
        },

        _resetForm: function () {
            ["inputNewID","inputNewName","inputNewPrice"].forEach(function(id){var o=this.byId(id);if(o){o.setValue("");o.setValueState("None");}}.bind(this));
            var oS=this.byId("inputNewStock"); if(oS) oS.setValue(0);
            var oC=this.byId("inputNewCategory"); if(oC){oC.setSelectedKey("");oC.setValue("");}
            var oM=this.byId("dialogMessageStrip"); if(oM) oM.setVisible(false);
        },

        onCancelDialog: function () { if (this._oDialog) this._oDialog.close(); },

        onConfirmProduct: function () {
            var sID=this.byId("inputNewID")?this.byId("inputNewID").getValue().trim():"";
            var sName=this.byId("inputNewName")?this.byId("inputNewName").getValue().trim():"";
            var sCat=this.byId("inputNewCategory")?(this.byId("inputNewCategory").getValue().trim()||"General"):"General";
            var nStock=this.byId("inputNewStock")?Number(this.byId("inputNewStock").getValue()):0;
            var nPrice=this.byId("inputNewPrice")?parseFloat(this.byId("inputNewPrice").getValue()):0;
            var sErr="";
            if(!this._editingId&&!sID) sErr="Product ID is required.";
            else if(!sName) sErr="Product Name is required.";
            else if(isNaN(nStock)||nStock<0) sErr="Stock must be 0 or more.";
            else if(isNaN(nPrice)||nPrice<0) sErr="Price must be 0 or more.";
            if(sErr){var oS=this.byId("dialogMessageStrip");if(oS){oS.setText(sErr);oS.setVisible(true);}return;}

            var sMethod=this._editingId?"PUT":"POST";
            var sPath=this._editingId?"/products/"+this._editingId:"/products";
            var oBody=this._editingId?{ProductName:sName,Category:sCat,Stock:nStock,Price:nPrice}:{ProductID:sID,ProductName:sName,Category:sCat,Stock:nStock,Price:nPrice};

            fetch(API_BASE+sPath,{method:sMethod,headers:{"Content-Type":"application/json"},body:JSON.stringify(oBody)})
                .then(function(r){return r.json();})
                .then(function(res){
                    if(res.success){MessageToast.show(sMethod==="POST"?"✅ Added!":"✅ Updated!");this._oDialog.close();this._loadProducts();}
                    else{var oS=this.byId("dialogMessageStrip");if(oS){oS.setText(res.error||"Failed.");oS.setVisible(true);}}
                }.bind(this))
                .catch(function(){
                    // Demo mode — update local model
                    var oModel=this.getView().getModel();
                    var products=[].concat(oModel.getProperty("/products")||[]);
                    if(sMethod==="POST"){
                        products.push({id:Date.now(),ProductID:sID,ProductName:sName,Category:sCat,Stock:nStock,Price:nPrice,LastUpdated:new Date().toISOString().split("T")[0]});
                    } else {
                        products=products.map(function(p){return p.id===this._editingId?Object.assign({},p,{ProductName:sName,Category:sCat,Stock:nStock,Price:nPrice}):p;}.bind(this));
                    }
                    this._setModelData(products);
                    if(this._oDialog) this._oDialog.close();
                    MessageToast.show("✅ Saved (demo mode)");
                }.bind(this));
        },

        onEditItem: function (oEvent) { var d=oEvent.getSource().getBindingContext().getObject(); this._editingId=d.id; this._openDialog("edit",d); },

        onDeleteItem: function (oEvent) {
            var oData=oEvent.getSource().getBindingContext().getObject();
            MessageBox.confirm("Delete \""+oData.ProductName+"\"?",{title:"Confirm Delete",actions:[MessageBox.Action.DELETE,MessageBox.Action.CANCEL],emphasizedAction:MessageBox.Action.DELETE,
                onClose:function(s){
                    if(s!==MessageBox.Action.DELETE) return;
                    fetch(API_BASE+"/products/"+oData.id,{method:"DELETE"})
                        .then(function(r){return r.json();})
                        .then(function(res){if(res.success){MessageToast.show("Deleted.");this._loadProducts();}}.bind(this))
                        .catch(function(){
                            var oModel=this.getView().getModel();
                            var products=(oModel.getProperty("/products")||[]).filter(function(p){return p.id!==oData.id;});
                            this._setModelData(products);
                            MessageToast.show("Deleted (demo mode)");
                        }.bind(this));
                }.bind(this)});
        },

        onItemPress: function (oEvent) {
            var d=oEvent.getSource().getBindingContext().getObject();
            MessageBox.information("ID: "+d.ProductID+"\nName: "+d.ProductName+"\nCategory: "+d.Category+"\nStock: "+d.Stock+" units\nPrice: ₹"+d.Price.toLocaleString("en-IN")+"\nUpdated: "+d.LastUpdated,{title:d.ProductName});
        },

        onExportCSV: function () {
            var products=this.getView().getModel().getProperty("/products");
            if(!products||!products.length){MessageToast.show("No data.");return;}
            var csv="ProductID,ProductName,Category,Stock,Price,LastUpdated\n"+products.map(function(p){return[p.ProductID,'"'+p.ProductName+'"',p.Category,p.Stock,p.Price,p.LastUpdated].join(",");}).join("\n");
            var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="inventory_"+new Date().toISOString().split("T")[0]+".csv";a.click();
            MessageToast.show("Exported!");
        },

        onSortDialog: function () {
            var ob=this.byId("inventoryTable").getBinding("items");if(!ob)return;
            MessageBox.confirm("Sort by:",{actions:["Stock ↑","Stock ↓","Name A→Z",MessageBox.Action.CANCEL],onClose:function(s){if(s==="Stock ↑")ob.sort(new Sorter("Stock",false));else if(s==="Stock ↓")ob.sort(new Sorter("Stock",true));else if(s==="Name A→Z")ob.sort(new Sorter("ProductName",false));}});
        },

        onFilterDialog: function () {
            var ob=this.byId("inventoryTable").getBinding("items");
            MessageBox.confirm("Filter:",{actions:["Low Stock (< 10)","Out of Stock","Show All",MessageBox.Action.CANCEL],onClose:function(s){if(!ob)return;if(s==="Low Stock (< 10)")ob.filter(new Filter("Stock",FilterOperator.LT,10));else if(s==="Out of Stock")ob.filter(new Filter("Stock",FilterOperator.EQ,0));else if(s==="Show All")ob.filter([]);}});
        },

        onSaveAll: function () { MessageToast.show("All changes saved."); },
        onTilePress: function (oEvent) { MessageToast.show(oEvent.getSource().getHeader()+" selected"); }
    });
});

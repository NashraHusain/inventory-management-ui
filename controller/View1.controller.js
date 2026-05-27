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
                products: [],
                totalItems: 0,
                lowStockCount: 0,
                outOfStockCount: 0,
                totalValueDisplay: "0",
                totalValueScale: "",
                categoryData: []
            }));
            this._editingId = null;
            this._oDialog   = null;
            this._loadProducts();
        },

        // ── Data ────────────────────────────────────────────────────────────────
        _loadProducts: function () {
            var oView = this.getView();
            oView.setBusy(true);
            fetch(API_BASE + "/products")
                .then(function (r) {
                    if (!r.ok) throw new Error("HTTP " + r.status);
                    return r.json();
                })
                .then(function (data) {
                    var products = data.map(function (item) {
                        return {
                            id:          item.id,
                            ProductID:   item.ProductID,
                            ProductName: item.ProductName,
                            Category:    item.Category,
                            Stock:       parseInt(item.Stock)   || 0,
                            Price:       parseFloat(item.Price) || 0,
                            LastUpdated: item.LastUpdated ? item.LastUpdated.split("T")[0] : "—"
                        };
                    });
                    var totalValue = products.reduce(function (s, p) { return s + p.Stock * p.Price; }, 0);
                    oView.getModel().setData({
                        products:          products,
                        totalItems:        products.length,
                        lowStockCount:     products.filter(function (p) { return p.Stock > 0 && p.Stock < 10; }).length,
                        outOfStockCount:   products.filter(function (p) { return p.Stock === 0; }).length,
                        totalValueDisplay: this._compact(totalValue),
                        totalValueScale:   totalValue >= 100000 ? "L" : totalValue >= 1000 ? "K" : "",
                        categoryData:      this._categoryData(products)
                    });
                    var oSync = this.byId("lastSyncText");
                    if (oSync) oSync.setText("Last sync: " + new Date().toLocaleTimeString());
                    oView.setBusy(false);
                }.bind(this))
                .catch(function () {
                    oView.setBusy(false);
                    MessageBox.error("Cannot connect to backend.\nRun:  node server.js", { title: "Connection Error" });
                });
        },

        _categoryData: function (products) {
            var map = {};
            products.forEach(function (p) { var c = p.Category || "Others"; map[c] = (map[c] || 0) + p.Stock; });
            return Object.keys(map).map(function (k) { return { Category: k, Stock: map[k] }; });
        },

        _compact: function (v) {
            if (v >= 10000000) return (v / 10000000).toFixed(1);
            if (v >= 100000)   return (v / 100000).toFixed(1);
            if (v >= 1000)     return (v / 1000).toFixed(1);
            return v.toFixed(0);
        },

        formatNumber: function (v) {
            if (v === undefined || v === null) return "0.00";
            return parseFloat(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },

        // ── Dark Mode ────────────────────────────────────────────────────────────
        onToggleDarkMode: function (oEvent) {
            var oPage = this.byId("mainPage");
            if (oEvent.getParameter("state")) {
                oPage.addStyleClass("darkMode");
                MessageToast.show("Dark Mode activated");
            } else {
                oPage.removeStyleClass("darkMode");
                MessageToast.show("Light Mode activated");
            }
        },

        onRefresh: function () { this._loadProducts(); MessageToast.show("Refreshed"); },

        // ── Search & Filter ──────────────────────────────────────────────────────
        onSearch: function (oEvent) {
            this._applyFilters((oEvent.getParameter("newValue") || "").trim(), this.byId("categoryFilter").getSelectedKey());
        },
        onCategoryFilter: function () {
            this._applyFilters(this.byId("searchField").getValue().trim(), this.byId("categoryFilter").getSelectedKey());
        },
        _applyFilters: function (q, cat) {
            var oBinding = this.byId("inventoryTable").getBinding("items");
            if (!oBinding) return;
            var f = [];
            if (q)   f.push(new Filter({ filters: [new Filter("ProductName", FilterOperator.Contains, q), new Filter("ProductID", FilterOperator.Contains, q), new Filter("Category", FilterOperator.Contains, q)], and: false }));
            if (cat) f.push(new Filter("Category", FilterOperator.EQ, cat));
            oBinding.filter(f.length ? new Filter({ filters: f, and: true }) : []);
        },

        // ── Dialog ───────────────────────────────────────────────────────────────
        // KEY FIX: use the correct namespace for the fragment path
        onOpenAddDialog: function () {
            this._editingId = null;
            this._openDialog("add", null);
        },

        _openDialog: function (sMode, oData) {
            var oView = this.getView();
            var pReady = this._oDialog
                ? Promise.resolve(this._oDialog)
                : Fragment.load({
                    id:         oView.getId(),
                    // Must match:  webapp/view/AddProduct.fragment.xml
                    // and namespace from manifest: ns.inventorymanagementui
                    name:       "ns.inventorymanagementui.view.AddProduct",
                    controller: this
                }).then(function (oDlg) {
                    this._oDialog = oDlg;
                    oView.addDependent(oDlg);
                    return oDlg;
                }.bind(this));

            pReady.then(function (oDlg) {
                // Reset all fields
                this._resetForm();

                if (sMode === "edit" && oData) {
                    oDlg.setTitle("Edit Product");
                    this.byId("inputNewID").setValue(oData.ProductID).setEditable(false);
                    this.byId("inputNewName").setValue(oData.ProductName);
                    this.byId("inputNewCategory").setValue(oData.Category);
                    this.byId("inputNewStock").setValue(oData.Stock);
                    this.byId("inputNewPrice").setValue(oData.Price);
                    this.byId("btnConfirmProduct").setText("Save Changes");
                } else {
                    oDlg.setTitle("Add New Product");
                    this.byId("inputNewID").setEditable(true);
                    this.byId("btnConfirmProduct").setText("Add Product");
                }
                oDlg.open();
            }.bind(this)).catch(function (err) {
                console.error("Fragment load failed:", err);
                MessageBox.error("Dialog could not open.\nCheck console for details.\n\n" + err.message);
            });
        },

        _resetForm: function () {
            ["inputNewID", "inputNewName", "inputNewPrice"].forEach(function (id) {
                var o = this.byId(id);
                if (o) { o.setValue(""); o.setValueState("None"); }
            }.bind(this));
            var oStock = this.byId("inputNewStock");
            if (oStock) oStock.setValue(0);
            var oCat = this.byId("inputNewCategory");
            if (oCat) { oCat.setSelectedKey(""); oCat.setValue(""); oCat.setValueState("None"); }
            var oStrip = this.byId("dialogMessageStrip");
            if (oStrip) oStrip.setVisible(false);
        },

        onCancelDialog: function () {
            if (this._oDialog) this._oDialog.close();
        },

        onConfirmProduct: function () {
            var sID    = this.byId("inputNewID")       ? this.byId("inputNewID").getValue().trim()           : "";
            var sName  = this.byId("inputNewName")     ? this.byId("inputNewName").getValue().trim()         : "";
            var sCat   = this.byId("inputNewCategory") ? (this.byId("inputNewCategory").getValue().trim() || "General") : "General";
            var nStock = this.byId("inputNewStock")    ? Number(this.byId("inputNewStock").getValue())       : 0;
            var nPrice = this.byId("inputNewPrice")    ? parseFloat(this.byId("inputNewPrice").getValue())   : 0;

            var sErr = "";
            if (!this._editingId && !sID)         sErr = "Product ID is required.";
            else if (!sName)                       sErr = "Product Name is required.";
            else if (isNaN(nStock) || nStock < 0)  sErr = "Stock must be 0 or more.";
            else if (isNaN(nPrice) || nPrice < 0)  sErr = "Price must be 0 or more.";

            if (sErr) {
                var oStrip = this.byId("dialogMessageStrip");
                if (oStrip) { oStrip.setText(sErr); oStrip.setVisible(true); }
                return;
            }

            var sMethod = this._editingId ? "PUT"  : "POST";
            var sPath   = this._editingId ? "/products/" + this._editingId : "/products";
            var oBody   = this._editingId
                ? { ProductName: sName, Category: sCat, Stock: nStock, Price: nPrice }
                : { ProductID: sID, ProductName: sName, Category: sCat, Stock: nStock, Price: nPrice };

            fetch(API_BASE + sPath, {
                method: sMethod,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oBody)
            })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (res.success) {
                    MessageToast.show(sMethod === "POST" ? "✅ Product added!" : "✅ Product updated!");
                    this._oDialog.close();
                    this._loadProducts();
                } else {
                    var oStrip = this.byId("dialogMessageStrip");
                    if (oStrip) { oStrip.setText(res.error || "Operation failed."); oStrip.setVisible(true); }
                }
            }.bind(this))
            .catch(function () { MessageBox.error("Network error — is the backend running?\n  node server.js"); });
        },

        // ── Edit & Delete ────────────────────────────────────────────────────────
        onEditItem: function (oEvent) {
            var oData = oEvent.getSource().getBindingContext().getObject();
            this._editingId = oData.id;
            this._openDialog("edit", oData);
        },

        onDeleteItem: function (oEvent) {
            var oData = oEvent.getSource().getBindingContext().getObject();
            MessageBox.confirm("Delete \"" + oData.ProductName + "\"?\nThis cannot be undone.", {
                title: "Confirm Delete",
                icon: MessageBox.Icon.WARNING,
                actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.DELETE,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.DELETE) return;
                    fetch(API_BASE + "/products/" + oData.id, { method: "DELETE" })
                        .then(function (r) { return r.json(); })
                        .then(function (res) {
                            if (res.success) { MessageToast.show("Deleted: " + oData.ProductName); this._loadProducts(); }
                        }.bind(this))
                        .catch(function () { MessageBox.error("Delete failed."); });
                }.bind(this)
            });
        },

        onItemPress: function (oEvent) {
            var d = oEvent.getSource().getBindingContext().getObject();
            MessageBox.information(
                "ID: " + d.ProductID + "\nName: " + d.ProductName +
                "\nCategory: " + d.Category + "\nStock: " + d.Stock +
                " units\nPrice: ₹" + d.Price.toLocaleString("en-IN") +
                "\nUpdated: " + d.LastUpdated,
                { title: d.ProductName }
            );
        },

        // ── Export ───────────────────────────────────────────────────────────────
        onExportCSV: function () {
            var products = this.getView().getModel().getProperty("/products");
            if (!products || !products.length) { MessageToast.show("No data to export."); return; }
            var csv = "ProductID,ProductName,Category,Stock,Price,LastUpdated\n" +
                products.map(function (p) {
                    return [p.ProductID, '"' + p.ProductName + '"', p.Category, p.Stock, p.Price, p.LastUpdated].join(",");
                }).join("\n");
            var a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
            a.download = "inventory_" + new Date().toISOString().split("T")[0] + ".csv";
            a.click();
            MessageToast.show("CSV exported!");
        },

        // ── Sort / Filter dialogs ─────────────────────────────────────────────────
        onSortDialog: function () {
            var ob = this.byId("inventoryTable").getBinding("items");
            if (!ob) return;
            MessageBox.confirm("Sort by:", {
                actions: ["Stock ↑", "Stock ↓", "Name A→Z", MessageBox.Action.CANCEL],
                onClose: function (s) {
                    if      (s === "Stock ↑")  ob.sort(new Sorter("Stock", false));
                    else if (s === "Stock ↓")  ob.sort(new Sorter("Stock", true));
                    else if (s === "Name A→Z") ob.sort(new Sorter("ProductName", false));
                }
            });
        },

        onFilterDialog: function () {
            var ob = this.byId("inventoryTable").getBinding("items");
            MessageBox.confirm("Quick filter:", {
                actions: ["Low Stock (< 10)", "Out of Stock", "Show All", MessageBox.Action.CANCEL],
                onClose: function (s) {
                    if (!ob) return;
                    if      (s === "Low Stock (< 10)") ob.filter(new Filter("Stock", FilterOperator.LT, 10));
                    else if (s === "Out of Stock")     ob.filter(new Filter("Stock", FilterOperator.EQ, 0));
                    else if (s === "Show All")         ob.filter([]);
                }
            });
        },

        onSaveAll:   function () { MessageToast.show("All changes are auto-saved to the database."); },
        onTilePress: function (oEvent) { MessageToast.show(oEvent.getSource().getHeader() + " selected"); }
    });
});
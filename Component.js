sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, Device, JSONModel) {
    "use strict";
 
    return UIComponent.extend("ns.inventorymanagementui.Component", {
 
        metadata: {
            manifest: "json"   // reads webapp/manifest.json automatically
        },
 
        init: function () {
            // Call parent init FIRST — loads routing, models, rootView
            UIComponent.prototype.init.apply(this, arguments);
 
            // Device model (used for responsive behaviour)
            var oDeviceModel = new JSONModel(Device);
            oDeviceModel.setDefaultBindingMode("OneWay");
            this.setModel(oDeviceModel, "device");
 
            // Initialize the router
            this.getRouter().initialize();
        }
    });
});
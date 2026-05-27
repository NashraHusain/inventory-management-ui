sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (BaseController) {
    "use strict";

    return BaseController.extend("ns.inventorymanagementui.controller.App", {
        onInit: function () {
            // Apply compact density on desktop
            if (sap.ui.Device.system.desktop) {
                this.getView().addStyleClass("sapUiSizeCompact");
            }
        }
    });
});
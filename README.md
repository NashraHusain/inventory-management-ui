# Enterprise Inventory & Stock Management Dashboard

An enterprise-grade full-stack web application designed to track products, manage real-time warehouse logistics, and handle supply chain movements. The application features a responsive, high-performance frontend built on **SAPUI5/Fiori Freestyle** architectures, connected via RESTful API paradigms to a **MySQL** relational database layer.

---

## 🚀 Key Features

* **Live Data Grid:** Uses high-performance analytical `sap.ui.table.Table` allocations for rapid corporate data visualization.
* **Full CRUD Lifecycle:** Seamless capability to Add, Read, Update, and Delete inventory items natively from the user interface.
* **Smart Business Logic Rules:** Dynamic UI states that automatically color stock levels **Red (Error)** if quantities fall below critical thresholds (< 10 units) to flag emergency reordering.
* **Real-Time Substring Search:** Front-end filtering logic that optimizes client-side row scanning dynamically as the user types.
* **Localization-Ready Formatting:** Integrated currency formatters supporting Indian Rupee (₹) localizations explicitly mapping decimal floats.

---

## 🛠️ Tech Stack & Architecture

### Frontend Layer
* **Framework:** SAPUI5 (Freestyle Architecture Framework)
* **Design Paradigm:** SAP Fiori Design Guidelines (MVC Pattern)
* **Environment:** Node.js local environment proxying runtime dependencies via VS Code Fiori Tools

### Backend Layer (Target Ecosystem)
* **API Protocol:** RESTful Routing Services
* **Ecosystem Compatibility:** Python (Django / FastAPI) OR Java (Spring Boot)

### Database Layer
* **Engine:** MySQL Relational Database Service
* **Schema Structure:** Relational constraints linking transactional tables via strict primary/foreign key indexing structures.

---

## 📁 Project Structure

```text
inventory-management-ui/
├── webapp/
│   ├── controller/
│   │   └── View1.controller.js  # Main JS logic, search filters, and CRUD triggers
│   ├── view/
│   │   ├── View1.view.xml      # Layout grid, tables, custom action headers
│   │   └── AddProduct.fragment.xml # Dialog modal layout for input aggregation
│   ├── manifest.json            # Application configuration, routing, and descriptors
│   └── index.html               # Main application local entry runtime point
├── package.json                 # Node scripts and development dependencies
└── README.md                    # Project documentation

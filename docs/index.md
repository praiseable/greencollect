# 🌍 GreenCollect — Documentation Hub

Welcome to the GreenCollect documentation! This is your complete guide to understanding, using, and deploying the GreenCollect marketplace platform.

---

## 📚 Documentation

### For Users
- **[User Manual](./USER_MANUAL.md)** — Complete guide for buyers, sellers, dealers, and administrators
  - Getting started
  - Creating listings
  - Browsing and searching
  - Using maps
  - Managing profile
  - Mobile app guide

### For Developers
- **[Project README](../README.md)** — Project overview, setup, and deployment
- **[Backend README](../backend/README.md)** — API endpoints, database, WebSocket events
- **[Web Client README](../apps/web-client/README.md)** — Pages, routes, map integration
- **[Web Admin README](../apps/web-admin/README.md)** — Admin pages, sidebar, login
- **[Mobile App README](../apps/mobile/README.md)** — Flutter build, test accounts, APK

### For Product Managers
- **[Product Overview](./PRODUCT_OVERVIEW.md)** — Complete product description
  - Problem statement
  - Solution architecture
  - User flows
  - Features and capabilities
  - Roadmap

### Technical References
- **[Database Persistence](./DATABASE_PERSISTENCE.md)** — Data safety guarantees
- **[Validation Checklist](./VALIDATION_CHECKLIST.md)** — Requirements compliance tracking

### AI Development Prompts
- **[Full-Stack Specification](./prompts/cursor_prompt.md)** — Master prompt for entire platform
- **[Mobile App Specification](./prompts/android_avd_prompt.md)** — Flutter AVD build specification

---

## 🚀 Quick Links

### Getting Started
- [Installation Guide](../README.md#quick-start)
- [User Registration](./USER_MANUAL.md#creating-an-account)
- [First Listing](./USER_MANUAL.md#creating-a-listing)
- [Admin Login](../apps/web-admin/README.md#-admin-login)

### Per-Project Setup
- [Backend Setup](../backend/README.md#-quick-start)
- [Web Client Setup](../apps/web-client/README.md#-quick-start)
- [Web Admin Setup](../apps/web-admin/README.md#-quick-start)
- [Mobile App Setup](../apps/mobile/README.md#-quick-start)

### Key Features
- [Interactive Maps](./USER_MANUAL.md#map-view)
- [Real-Time Chat](./USER_MANUAL.md#contacting-sellers)
- [Multi-Language Support](./PRODUCT_OVERVIEW.md#internationalization)
- [Admin Portal](./USER_MANUAL.md#for-administrators)

### Deployment
- [Production Deployment](../README.md#deployment)
- [Environment Variables](../README.md#environment-variables)
- [Database Safety](./DATABASE_PERSISTENCE.md)

---

## 🎯 What is GreenCollect?

**GreenCollect** is a geo-fenced, franchise-based marketplace platform for trading recyclable and reusable goods. Built for Pakistan, it connects buyers, sellers, dealers, and franchises through a controlled, location-based supply chain system.

### Key Features
- ✅ **Geo-Zone Based Trading** — Listings organized by location
- ✅ **Interactive Maps** — Browse listings on map (web & mobile)
- ✅ **Real-Time Communication** — Chat with sellers instantly
- ✅ **Multi-Currency** — PKR, USD, AED, SAR, GBP support
- ✅ **Bilingual UI** — Urdu (RTL) and English
- ✅ **Mobile & Web** — Flutter app + React.js portals
- ✅ **Admin Dashboard** — Complete system management

---

## 📖 Documentation Structure

```
docs/
├── index.md                  # This file (documentation hub)
├── PRODUCT_OVERVIEW.md       # Product description and architecture
├── USER_MANUAL.md            # Complete user guide
├── DATABASE_PERSISTENCE.md   # Data safety guarantees
├── VALIDATION_CHECKLIST.md   # Requirements compliance
└── prompts/                  # AI development prompts
    ├── cursor_prompt.md      # Full-stack specification
    └── android_avd_prompt.md # Flutter mobile app specification
```

**Per-project docs live in their respective folders:**

```
backend/README.md             # Backend API docs
apps/web-client/README.md     # Web client docs
apps/web-admin/README.md      # Admin portal docs
apps/mobile/README.md         # Mobile app docs
```

---

## 🆘 Need Help?

- **User Support**: See [User Manual — Troubleshooting](./USER_MANUAL.md#troubleshooting)
- **Technical Issues**: Open a [GitHub Issue](https://github.com/praiseable/greencollect/issues)
- **Email Support**: support@greencollect.pk

---

## 🔗 External Links

- **GitHub Repository**: [github.com/praiseable/greencollect](https://github.com/praiseable/greencollect)
- **Live Website**: [gc.directconnect.services](https://gc.directconnect.services)
- **Admin Portal**: [gc.directconnect.services:8080](https://gc.directconnect.services:8080)

---

**Last Updated**: March 2026  
**Version**: 2.0.0

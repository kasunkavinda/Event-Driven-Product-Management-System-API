# Event-Driven-Product-Management-System-API

This project is an **Event-Driven Product Management System API** designed to help sellers easily _manage their product inventory_. It allows sellers to create, update, list, and delete products through a primary set of API endpoints. The system leverages **Kafka** for _asynchronous event communication_ (like new products or low stock warnings) and delivers _real-time updates_ directly to sellers via **Server-Sent Events (SSE)**. All product data is _persisted_ in a database, and critical actions are _logged_ for auditing, while access to product management features is secured by a **seller authorization guard**.

## Visual Overview

![alt text](image.png)

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

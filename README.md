# QOVA QA Sample Store

A deterministic, dependency-free storefront used to demonstrate repository-based scenario
generation and CDP execution in QOVA.

## Run

```bash
npm start
```

Open <http://127.0.0.1:4173>.

## Suggested QA journeys

- Filter products by category and search term.
- Add a product to the cart and change its quantity.
- Verify that checkout blocks an invalid email address.
- Complete checkout with a valid email address and confirm that the cart resets.

The application uses only fictional products and stores cart state in the current browser session.


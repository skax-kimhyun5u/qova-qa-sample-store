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
- Switch between the seeded viewer and inventory-manager sessions; verify that only the manager
  can hide or restore a product and that a denied request does not create an audit record.

## Deterministic permission fixtures

Permission scenarios must create their session through `POST /api/session` with a JSON body. The
supported fixture inputs and returned roles are stable test contracts:

| UI action | Request body | Returned role |
| --- | --- | --- |
| `QA 조회자로 전환` | `{ "actorId": "viewer" }` | `viewer` |
| `재고 관리자로 전환` | `{ "actorId": "manager" }` | `inventoryManager` |

The response sets the `orbit_session` cookie used by `POST /api/inventory/visibility`. For a
deterministic authorization check, start from a reset server, select the viewer fixture, and submit
`{ "productId": "halo-lamp", "hidden": true }`. The response is `403` with
`재고 관리자 권한이 필요합니다.`, the product remains visible, and the audit log stays empty.
Repeat with the manager fixture: the response is `200`, `halo-lamp` becomes hidden, and exactly one
`product.hidden` audit record is written for actor `manager`.

The application uses only fictional products and stores cart state in the current browser session.

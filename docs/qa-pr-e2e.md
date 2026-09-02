# QA PR scenario evidence

This pull request documents two existing browser behaviors for QOVA's PR-based QA walkthrough:

1. Searching for `notebook` displays the matching catalog item.
2. Adding the matching item to the cart updates the cart count from `0` to `1`.

The QA scenario should keep these actions in order, verify the visible search result, and verify
the updated cart count. The document changes no runtime behavior.

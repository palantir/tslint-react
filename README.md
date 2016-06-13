# tslint-react

React-specific rules for TSLint.

### Rules

- `no-lambda-in-jsx`
  - Creating new anonymous functions (with either the `function` syntax or ES2015 arrow syntax) inside the `render` call stack works against _pure component rendering_. When doing an equality check between two lambdas, React will always consider them unequal values and force the component to re-render more often than necessary.
  - Rule options: _none_

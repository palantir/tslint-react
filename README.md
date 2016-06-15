# tslint-react

React-specific rules for TSLint.

### Rules

- `jsx-no-lambda`
  - Creating new anonymous functions (with either the `function` syntax or ES2015 arrow syntax) inside the `render` call stack works against _pure component rendering_. When doing an equality check between two lambdas, React will always consider them unequal values and force the component to re-render more often than necessary.
  - Rule options: _none_
- `no-string-ref`
  - Passing strings to the `ref` prop of React elements is considered a legacy feature and will soon be deprecated.
    Instead, [use a callback](https://facebook.github.io/react/docs/more-about-refs.html#the-ref-callback-attribute).
  - Rule options: _none_

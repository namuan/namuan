# OutOfTarPit [Paper](https://curtclifton.net/papers/MoseleyMarks06a.pdf)

## Approaches to understanding complexity

### Complexity

- **Essential Complexity**
  Inherent in the problem (not the solution)
- **Accidental Complexity**
  Only visible in the solution
    - Performance
    - Sub-Optimal choices

### Testing

- **Black Box**
- **Outside In**
  - Leads to more error being detected

### Informal Reasoning

- **Inside Out**
- Leads to less errors being created

### Formal Reasoning

- **Accuracy of Specifications**

## Cases of Complexity

### State

- Turn it off and on again
- Difficulty in enumerating all states
- Testing
  - Always start in clean state
  - Then Test
  - **In Reality, clean slate is not always possible**

### Control

- Order in which things happen
  - Defines implicitly as the language forces you to
  - Concurrency ??

### Code Volume

- Not as important as state/control
- **Law**?? for using the language with least amount of features to work


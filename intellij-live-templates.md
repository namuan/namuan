# IntelliJ IDEA Live Templates

## pyboiler

Boilerplate with all the goodies.

Applicable in Python: top-level

```python
#!/usr/bin/env python3
"""
A simple script

Usage:
./template_py_scripts.py -h

./template_py_scripts.py -v # To log INFO messages
./template_py_scripts.py -vv # To log DEBUG messages
"""
import logging
from argparse import ArgumentParser, RawDescriptionHelpFormatter


def setup_logging(verbosity):
    logging_level = logging.WARNING
    if verbosity == 1:
        logging_level = logging.INFO
    elif verbosity >= 2:
        logging_level = logging.DEBUG

    logging.basicConfig(
        handlers=[
            logging.StreamHandler(),
        ],
        format="%(asctime)s - %(filename)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        level=logging_level,
    )
    logging.captureWarnings(capture=True)


def parse_args():
    parser = ArgumentParser(description=__doc__, formatter_class=RawDescriptionHelpFormatter)
    parser.add_argument(
        "-v",
        "--verbose",
        action="count",
        default=0,
        dest="verbose",
        help="Increase verbosity of logging output",
    )
    return parser.parse_args()


def main(args):
    logging.debug(f"This is a debug log message: {args.verbose}")
    logging.info(f"This is an info log message: {args.verbose}")


if __name__ == "__main__":
    args = parse_args()
    setup_logging(args.verbose)
    main(args)
```

## pyfire

Boilerplate with Google Fire CLI

Applicable in Python: top-level

```python
#!/usr/bin/env python3
"""
$DESCRIPTION$
"""
import logging

import fire  # type: ignore

logging.basicConfig(
    handlers=[
        logging.StreamHandler(),
    ],
    format="%(asctime)s - %(filename)s:%(lineno)d - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
logging.captureWarnings(capture=True)


def main(arg1: str, arg2: str) -> None:
    logging.info(
        "Argument {} and {}",
        arg1,
        arg2,
    )


def cli() -> None:
    fire.Fire(main)


if __name__ == "__main__":
    cli()
```

## pyworkflow

Boilerplate using py-executable-checklist

Available in Python: top-level

```python
#!/usr/bin/env python3
"""
$DESCRIPTION$
"""
import logging
from argparse import ArgumentParser, RawDescriptionHelpFormatter

from py_executable_checklist.workflow import run_workflow, WorkflowBase


def setup_logging(verbosity):
    logging_level = logging.WARNING
    if verbosity == 1:
        logging_level = logging.INFO
    elif verbosity >= 2:
        logging_level = logging.DEBUG

    logging.basicConfig(
        handlers=[
            logging.StreamHandler(),
        ],
        format="%(asctime)s - %(filename)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        level=logging_level,
    )
    logging.captureWarnings(capture=True)


# Common functions across steps

# Workflow steps

class DoSomething(WorkflowBase):
    """
    Go to this page
    Copy the command
    Run the command
    Copy the output and paste it into the email
    """

    username: str

    def execute(self):
        logging.info(f"Hello {self.username}")

        # output
        return {"greetings": f"Hello {self.username}"}


# Workflow definition


def workflow():
    return [
        DoSomething,
    ]


# Boilerplate


def parse_args():
    parser = ArgumentParser(
        description=__doc__, formatter_class=RawDescriptionHelpFormatter
    )
    parser.add_argument("-u", "--username", type=str, required=True, help="User name")
    parser.add_argument(
        "-v",
        "--verbose",
        action="count",
        default=0,
        dest="verbose",
        help="Increase verbosity of logging output. Display context variables between each step run",
    )
    return parser.parse_args()


def main() -> None:  # pragma: no cover
    args = parse_args()
    setup_logging(args.verbose)
    context = args.__dict__
    run_workflow(context, workflow())


if __name__ == "__main__":  # pragma: no cover
    main()
```

## pystep

Workflow Step using py-executable-checklist

Applicable in Python: top-level

```python
from py_executable_checklist.workflow import WorkflowBase
import logging

class $STEPNAME$(WorkflowBase):
    """
    $DOCUMENT$
    """

    username: str

    def execute(self) -> dict:
        logging.info("Hello %s", self.username)

        # output
        return {"todo": "Next Step"}
```

## ktlog

Define logger to use in Kotlin

Applicable in Kotlin: top-level.

```kotlin
private val logger = mu.KotlinLogging.logger {}
```

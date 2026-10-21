#!/usr/bin/env node
import { greet } from '~/greet'

const name = process.argv[2] ?? 'world'

process.stdout.write(`${greet(name)}\n`)

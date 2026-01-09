Terminal 1 (start serveren):

  cd /Users/cb/Apps/cbroberg/codescan
  ./start-server.sh
  
  ### ctrl+b to run in background

  Terminal 2 (test eller brug CLI):

```bash
  pnpm cli init          # Setup directories
  pnpm cli index         # Build index  
  pnpm cli search "xyz"  # Search
  pnpm cli chat          # Interactive chat
  pnpm cli status        # Check status
```

```bash
# Link CLI to system PATH
cd packages/cli
pnpm link --global

# Now you can use codescan from anywhere:
codescan init
codescan index
codescan search "your query"
codescan server start
```

#!/bin/bash
find src -name "*.js" -exec sed -i "s|require('../core/models/|require('../storage/models').| g" {} \;
find src -name "*.js" -exec sed -i "s|require('./models/|require('../storage/models').| g" {} \;
find src -name "*.js" -exec sed -i "s|require('../core/|require('../services/| g" {} \;
find src -name "*.js" -exec sed -i "s|require('./core/|require('../services/| g" {} \;
echo "All paths fixed"

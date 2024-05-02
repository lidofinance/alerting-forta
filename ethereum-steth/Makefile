# Makefile

.PHONY: gen_ts
gen_js:
	# generate js codes via grpc-tools
	yarn grpc_tools_node_protoc \
	  --js_out=import_style=commonjs,binary:./src/proto \
	  --grpc_out=grpc_js:./src/proto \
	  --plugin=protoc-gen-grpc=./node_modules/.bin/grpc_tools_node_protoc_plugin \
	  -I=./src/proto \
	  ./src/proto/*.proto


.PHONY: gen_ts
gen_ts:
	# generate d.ts codes
	yarn grpc_tools_node_protoc \
    --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
    --ts_out=grpc_js:./src/proto \
    -I ./src/proto \
    ./src/proto/*.proto

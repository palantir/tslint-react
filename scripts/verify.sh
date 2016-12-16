#!/bin/bash

ret=0;
for path in `find test -name tslint.json`; do
    tslint -r ./build/rules/ --test $path/..
    val=$?
    if [ "$val" -ne "0" ]; then
        ret=$val
    fi
done
exit $ret

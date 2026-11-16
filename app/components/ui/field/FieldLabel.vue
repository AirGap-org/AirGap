<script setup>
import { cn } from "~/lib/utils";
import { Label } from '@/components/ui/label';

const props = defineProps({
  class: {
    type: [Boolean, null, String, Object, Array],
    required: false,
    skipCheck: true,
  },
  for: { type: String },
  text: { type: String }
});

</script>

<template>
  <Label
      :for="props.for"
      data-slot="field-label"
      :class="cn('text-sm font-medium leading-none', props.class)"
  >
    <template v-if="props.text">{{ props.text }}</template>
    <slot v-else />
  </Label>
</template>
